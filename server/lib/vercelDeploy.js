const axios = require('axios');
const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');
const settings = require('../settings');

const VERCEL_API = 'https://api.vercel.com';

const SUPPORTED_FRAMEWORKS = {
  nextjs: {
    name: 'Next.js',
    configFiles: ['next.config.js', 'next.config.mjs', 'next.config.ts'],
    buildCommand: 'npm run build',
    outputDirectory: '.next',
    installCommand: 'npm install'
  },
  nuxtjs: {
    name: 'Nuxt.js',
    configFiles: ['nuxt.config.js', 'nuxt.config.ts'],
    buildCommand: 'npm run build',
    outputDirectory: '.output',
    installCommand: 'npm install'
  },
  vite: {
    name: 'Vite',
    configFiles: ['vite.config.js', 'vite.config.ts'],
    buildCommand: 'npm run build',
    outputDirectory: 'dist',
    installCommand: 'npm install'
  },
  react: {
    name: 'React (CRA)',
    configFiles: [],
    detectBy: ['src/App.js', 'src/App.jsx', 'src/App.tsx'],
    buildCommand: 'npm run build',
    outputDirectory: 'build',
    installCommand: 'npm install'
  },
  vue: {
    name: 'Vue.js',
    configFiles: ['vue.config.js'],
    buildCommand: 'npm run build',
    outputDirectory: 'dist',
    installCommand: 'npm install'
  },
  sveltekit: {
    name: 'SvelteKit',
    configFiles: ['svelte.config.js'],
    buildCommand: 'npm run build',
    outputDirectory: '.svelte-kit',
    installCommand: 'npm install'
  },
  astro: {
    name: 'Astro',
    configFiles: ['astro.config.mjs', 'astro.config.js', 'astro.config.ts'],
    buildCommand: 'npm run build',
    outputDirectory: 'dist',
    installCommand: 'npm install'
  },
  angular: {
    name: 'Angular',
    configFiles: ['angular.json'],
    buildCommand: 'npm run build',
    outputDirectory: 'dist',
    installCommand: 'npm install'
  },
  gatsby: {
    name: 'Gatsby',
    configFiles: ['gatsby-config.js', 'gatsby-config.ts'],
    buildCommand: 'npm run build',
    outputDirectory: 'public',
    installCommand: 'npm install'
  },
  remix: {
    name: 'Remix',
    configFiles: ['remix.config.js'],
    buildCommand: 'npm run build',
    outputDirectory: 'build',
    installCommand: 'npm install'
  },
  html: {
    name: 'Static HTML',
    configFiles: [],
    detectBy: ['index.html'],
    buildCommand: null,
    outputDirectory: null,
    installCommand: null
  },
  php: {
    name: 'PHP',
    configFiles: [],
    detectBy: ['index.php'],
    buildCommand: null,
    outputDirectory: null,
    installCommand: null
  }
};

const TEXT_EXTENSIONS = [
  '.html', '.htm', '.css', '.scss', '.sass', '.less',
  '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs',
  '.json', '.md', '.mdx', '.txt', '.xml', '.yaml', '.yml',
  '.svg', '.vue', '.svelte', '.astro',
  '.php', '.py', '.rb', '.go', '.rs', '.java',
  '.env', '.env.local', '.env.production', '.env.development',
  '.gitignore', '.npmrc', '.nvmrc',
  '.htaccess', '.htpasswd',
  '.sh', '.bash', '.zsh',
  '.graphql', '.gql',
  '.lock', '.toml'
];

const BINARY_EXTENSIONS = [
  '.png', '.jpg', '.jpeg', '.gif', '.ico', '.webp', '.bmp', '.tiff',
  '.woff', '.woff2', '.ttf', '.eot', '.otf',
  '.pdf', '.doc', '.docx',
  '.mp3', '.mp4', '.wav', '.webm', '.ogg',
  '.zip', '.tar', '.gz', '.rar'
];

const ALLOWED_EXTENSIONS = [...TEXT_EXTENSIONS, ...BINARY_EXTENSIONS];

async function getVercelHeaders() {
  if (!settings.vercel_token) {
    throw new Error('Vercel token belum diset dalam settings.js');
  }
  return {
    'Authorization': `Bearer ${settings.vercel_token}`,
    'Content-Type': 'application/json'
  };
}

async function listDeployments(limit = 10) {
  try {
    const headers = await getVercelHeaders();
    let url = `${VERCEL_API}/v6/deployments?limit=${limit}`;
    
    if (settings.vercel_team_id) {
      url += `&teamId=${settings.vercel_team_id}`;
    }
    
    const response = await axios.get(url, { headers });
    return {
      success: true,
      deployments: response.data.deployments
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.error?.message || error.message
    };
  }
}

async function getDeployment(deploymentId) {
  try {
    const headers = await getVercelHeaders();
    let url = `${VERCEL_API}/v13/deployments/${deploymentId}`;
    
    if (settings.vercel_team_id) {
      url += `?teamId=${settings.vercel_team_id}`;
    }
    
    const response = await axios.get(url, { headers });
    return {
      success: true,
      deployment: response.data
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.error?.message || error.message
    };
  }
}

function detectFramework(files) {
  const fileNames = files.map(f => f.file.toLowerCase());
  const filePaths = files.map(f => f.file);
  
  for (const [frameworkKey, framework] of Object.entries(SUPPORTED_FRAMEWORKS)) {
    if (framework.configFiles && framework.configFiles.length > 0) {
      for (const configFile of framework.configFiles) {
        if (fileNames.some(f => f === configFile.toLowerCase() || f.endsWith('/' + configFile.toLowerCase()))) {
          return {
            key: frameworkKey,
            ...framework
          };
        }
      }
    }
  }
  
  for (const [frameworkKey, framework] of Object.entries(SUPPORTED_FRAMEWORKS)) {
    if (framework.detectBy && framework.detectBy.length > 0) {
      for (const detectFile of framework.detectBy) {
        if (filePaths.some(f => f.toLowerCase() === detectFile.toLowerCase() || f.toLowerCase().endsWith('/' + detectFile.toLowerCase()))) {
          return {
            key: frameworkKey,
            ...framework
          };
        }
      }
    }
  }
  
  const packageJsonFile = files.find(f => f.file === 'package.json' || f.file.endsWith('/package.json'));
  if (packageJsonFile) {
    try {
      const packageData = JSON.parse(packageJsonFile.data);
      const deps = { ...packageData.dependencies, ...packageData.devDependencies };
      
      if (deps['next']) return { key: 'nextjs', ...SUPPORTED_FRAMEWORKS.nextjs };
      if (deps['nuxt']) return { key: 'nuxtjs', ...SUPPORTED_FRAMEWORKS.nuxtjs };
      if (deps['@sveltejs/kit']) return { key: 'sveltekit', ...SUPPORTED_FRAMEWORKS.sveltekit };
      if (deps['astro']) return { key: 'astro', ...SUPPORTED_FRAMEWORKS.astro };
      if (deps['gatsby']) return { key: 'gatsby', ...SUPPORTED_FRAMEWORKS.gatsby };
      if (deps['@remix-run/react']) return { key: 'remix', ...SUPPORTED_FRAMEWORKS.remix };
      if (deps['vue']) return { key: 'vue', ...SUPPORTED_FRAMEWORKS.vue };
      if (deps['react']) return { key: 'react', ...SUPPORTED_FRAMEWORKS.react };
      if (deps['vite']) return { key: 'vite', ...SUPPORTED_FRAMEWORKS.vite };
      if (deps['@angular/core']) return { key: 'angular', ...SUPPORTED_FRAMEWORKS.angular };
    } catch (e) {
    }
  }
  
  if (fileNames.some(f => f === 'index.html' || f.endsWith('/index.html'))) {
    return { key: 'html', ...SUPPORTED_FRAMEWORKS.html };
  }
  
  if (fileNames.some(f => f.endsWith('.php'))) {
    return { key: 'php', ...SUPPORTED_FRAMEWORKS.php };
  }
  
  return null;
}

function isTextFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (TEXT_EXTENSIONS.includes(ext)) return true;
  
  const baseName = path.basename(filePath).toLowerCase();
  const noExtTextFiles = [
    'dockerfile', 'makefile', 'procfile', 'license', 'readme',
    '.gitignore', '.npmrc', '.nvmrc', '.env', '.babelrc', '.eslintrc', '.prettierrc'
  ];
  if (noExtTextFiles.some(f => baseName === f || baseName.startsWith(f))) return true;
  
  return false;
}

function isBinaryFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return BINARY_EXTENSIONS.includes(ext);
}

function isAllowedFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const baseName = path.basename(filePath).toLowerCase();
  
  const ignoredPatterns = [
    'node_modules', '.git', '.svn', '.hg', '.idea', '.vscode',
    '__pycache__', '.DS_Store', 'Thumbs.db', '.env.local',
    '.next', '.nuxt', '.output', '.cache'
  ];
  
  const pathParts = filePath.split('/');
  if (pathParts.some(part => ignoredPatterns.includes(part))) {
    return false;
  }
  
  if (ext === '' && isTextFile(filePath)) return true;
  if (ALLOWED_EXTENSIONS.includes(ext)) return true;
  
  return false;
}

async function extractZipWithStructure(zipBuffer, baseFolder = '') {
  const files = [];
  
  try {
    const zip = new AdmZip(zipBuffer);
    const zipEntries = zip.getEntries();
    
    let rootFolder = '';
    const hasSingleRootFolder = zipEntries.length > 0 && zipEntries.every(entry => {
      const parts = entry.entryName.split('/');
      if (parts.length > 1) {
        if (!rootFolder) rootFolder = parts[0];
        return parts[0] === rootFolder;
      }
      return false;
    });
    
    for (const entry of zipEntries) {
      if (entry.isDirectory) continue;
      
      let filePath = entry.entryName;
      
      if (hasSingleRootFolder && rootFolder) {
        filePath = filePath.replace(rootFolder + '/', '');
      }
      
      if (baseFolder) {
        filePath = baseFolder + '/' + filePath;
      }
      
      if (!isAllowedFile(filePath)) continue;
      
      const fileBuffer = entry.getData();
      const isText = isTextFile(filePath);
      
      files.push({
        file: filePath,
        data: isText ? fileBuffer.toString('utf8') : fileBuffer.toString('base64'),
        encoding: isText ? 'utf-8' : 'base64'
      });
    }
    
    return {
      success: true,
      files: files,
      totalExtracted: files.length
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      files: []
    };
  }
}

function processFilesWithStructure(fileList, baseFolder = '') {
  const processedFiles = [];
  
  for (const file of fileList) {
    let filePath = file.file;
    
    if (baseFolder && !filePath.startsWith(baseFolder)) {
      filePath = baseFolder + '/' + filePath;
    }
    
    filePath = filePath.replace(/^\/+/, '').replace(/\/+/g, '/');
    
    processedFiles.push({
      file: filePath,
      data: file.data,
      encoding: file.encoding || 'utf-8'
    });
  }
  
  return processedFiles;
}

async function createDeployment(projectName, files, options = {}) {
  try {
    const headers = await getVercelHeaders();
    
    const processedFiles = processFilesWithStructure(files);
    const detectedFramework = detectFramework(processedFiles);
    
    let frameworkSettings = {};
    const nonVercelFrameworks = ['html', 'php'];
    
    if (detectedFramework && detectedFramework.key === 'html') {
      const hasVercelConfig = processedFiles.some(f => f.file === 'vercel.json' || f.file.endsWith('/vercel.json'));
      
      if (!hasVercelConfig) {
        const vercelConfig = {
          "version": 2,
          "builds": [
            {
              "src": "**/*",
              "use": "@vercel/static"
            }
          ],
          "routes": [
            {
              "src": "/(.*)",
              "dest": "/$1"
            }
          ]
        };
        
        processedFiles.push({
          file: 'vercel.json',
          data: JSON.stringify(vercelConfig, null, 2),
          encoding: 'utf-8'
        });
      }
      
      frameworkSettings = {
        framework: null,
        buildCommand: null,
        outputDirectory: null,
        installCommand: null
      };
    } else if (detectedFramework) {
      frameworkSettings = {
        framework: nonVercelFrameworks.includes(detectedFramework.key) ? null : detectedFramework.key,
        buildCommand: options.buildCommand || detectedFramework.buildCommand,
        outputDirectory: options.outputDirectory || detectedFramework.outputDirectory,
        installCommand: options.installCommand || detectedFramework.installCommand
      };
    }
    
    const payload = {
      name: projectName || settings.vercel_project_name,
      files: processedFiles,
      projectSettings: {
        framework: frameworkSettings.framework || null,
        buildCommand: frameworkSettings.buildCommand || options.buildCommand || null,
        outputDirectory: frameworkSettings.outputDirectory || options.outputDirectory || null,
        installCommand: frameworkSettings.installCommand || options.installCommand || null,
        devCommand: options.devCommand || null
      },
      target: options.target || 'production'
    };
    
    let url = `${VERCEL_API}/v13/deployments?skipAutoDetectionConfirmation=1`;
    if (settings.vercel_team_id) {
      url += `&teamId=${settings.vercel_team_id}`;
    }
    
    const response = await axios.post(url, payload, { headers });
    const deployment = response.data;
    
    const rawUrl = deployment.url || '';
    const deploymentUrl = rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`;
    
    const aliasUrls = (deployment.alias || []).map(a => {
      return a.startsWith('http') ? a : `https://${a}`;
    });
    
    // Get the actual public production domain
    let publicProductionUrl = '';
    let projectDomains = [];
    
    try {
      // Wait for Vercel to process the deployment
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Fetch project info to get the actual production domain
      const deployedProjectName = deployment.name;
      let projectUrl = `${VERCEL_API}/v9/projects/${deployedProjectName}`;
      if (settings.vercel_team_id) {
        projectUrl += `?teamId=${settings.vercel_team_id}`;
      }
      
      const projectResponse = await axios.get(projectUrl, { headers });
      const projectData = projectResponse.data;
      
      // Method 1: Get from project link (most reliable for public domain)
      if (projectData.link && projectData.link.productionBranch) {
        // This might have the production domain
      }
      
      // Method 2: Get from latest production deployment
      if (projectData.latestDeployments && projectData.latestDeployments.length > 0) {
        for (const dep of projectData.latestDeployments) {
          if (dep.target === 'production' && dep.alias && dep.alias.length > 0) {
            // Filter for short .vercel.app domains (public domains)
            const publicDomains = dep.alias.filter(a => {
              // Public domains are short and don't have long random strings
              const parts = a.split('-');
              return a.endsWith('.vercel.app') && parts.length <= 3;
            });
            if (publicDomains.length > 0) {
              publicDomains.sort((a, b) => a.length - b.length);
              publicProductionUrl = `https://${publicDomains[0]}`;
              projectDomains = dep.alias.map(a => `https://${a}`);
              break;
            }
          }
        }
      }
      
      // Method 3: Check project targets
      if (!publicProductionUrl && projectData.targets && projectData.targets.production) {
        const prodTarget = projectData.targets.production;
        if (prodTarget.alias && prodTarget.alias.length > 0) {
          const publicDomains = prodTarget.alias.filter(a => {
            const parts = a.split('-');
            return a.endsWith('.vercel.app') && parts.length <= 3;
          });
          if (publicDomains.length > 0) {
            publicDomains.sort((a, b) => a.length - b.length);
            publicProductionUrl = `https://${publicDomains[0]}`;
            projectDomains = prodTarget.alias.map(a => `https://${a}`);
          }
        }
      }
      
      // Method 4: Look for domains in project (custom or auto-assigned)
      if (!publicProductionUrl && projectData.alias && projectData.alias.length > 0) {
        const domains = projectData.alias.map(a => a.domain || a);
        const publicDomains = domains.filter(d => {
          const parts = d.split('-');
          return d.endsWith('.vercel.app') && parts.length <= 3;
        });
        if (publicDomains.length > 0) {
          publicDomains.sort((a, b) => a.length - b.length);
          publicProductionUrl = `https://${publicDomains[0]}`;
          projectDomains = domains.map(d => `https://${d}`);
        }
      }
      
      console.log('[Vercel] Project data:', JSON.stringify({
        name: projectData.name,
        id: projectData.id,
        alias: projectData.alias,
        targets: projectData.targets ? Object.keys(projectData.targets) : null,
        latestDeployments: projectData.latestDeployments ? projectData.latestDeployments.length : 0
      }, null, 2));
      
    } catch (projectError) {
      console.log('[Vercel] Could not fetch project info:', projectError.message);
    }
    
    // Fallback: use deployment URL if no public domain found
    if (!publicProductionUrl) {
      publicProductionUrl = deploymentUrl;
      projectDomains = aliasUrls;
    }
    
    // Ensure URL has https://
    if (!publicProductionUrl.startsWith('http')) {
      publicProductionUrl = `https://${publicProductionUrl}`;
    }
    
    return {
      success: true,
      deployment: deployment,
      url: publicProductionUrl,
      projectUrl: publicProductionUrl,
      deploymentUrl: deploymentUrl,
      aliasUrls: projectDomains.length > 0 ? projectDomains : aliasUrls,
      deploymentId: deployment.id,
      framework: detectedFramework ? detectedFramework.name : 'Static',
      filesCount: processedFiles.length
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.error?.message || error.message
    };
  }
}

async function deployFromGit(repoUrl, options = {}) {
  try {
    const headers = await getVercelHeaders();
    
    const payload = {
      name: options.projectName || settings.vercel_project_name,
      gitSource: {
        type: 'github',
        repoId: options.repoId,
        ref: options.branch || 'main'
      },
      projectSettings: {
        framework: options.framework || null,
        buildCommand: options.buildCommand || null,
        outputDirectory: options.outputDirectory || null,
        installCommand: options.installCommand || null,
        devCommand: options.devCommand || null
      },
      target: options.target || 'production'
    };
    
    let url = `${VERCEL_API}/v13/deployments?skipAutoDetectionConfirmation=1`;
    if (settings.vercel_team_id) {
      url += `&teamId=${settings.vercel_team_id}`;
    }
    
    const response = await axios.post(url, payload, { headers });
    return {
      success: true,
      deployment: response.data,
      url: response.data.url
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.error?.message || error.message
    };
  }
}

async function deleteDeployment(deploymentId) {
  try {
    const headers = await getVercelHeaders();
    let url = `${VERCEL_API}/v13/deployments/${deploymentId}`;
    
    if (settings.vercel_team_id) {
      url += `?teamId=${settings.vercel_team_id}`;
    }
    
    await axios.delete(url, { headers });
    return {
      success: true,
      message: `Deployment ${deploymentId} deleted successfully`
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.error?.message || error.message
    };
  }
}

async function listProjects() {
  try {
    const headers = await getVercelHeaders();
    let url = `${VERCEL_API}/v9/projects`;
    
    if (settings.vercel_team_id) {
      url += `?teamId=${settings.vercel_team_id}`;
    }
    
    const response = await axios.get(url, { headers });
    return {
      success: true,
      projects: response.data.projects
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.error?.message || error.message
    };
  }
}

async function getProject(projectId) {
  try {
    const headers = await getVercelHeaders();
    let url = `${VERCEL_API}/v9/projects/${projectId}`;
    
    if (settings.vercel_team_id) {
      url += `?teamId=${settings.vercel_team_id}`;
    }
    
    const response = await axios.get(url, { headers });
    return {
      success: true,
      project: response.data
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.error?.message || error.message
    };
  }
}

async function redeployLatest(projectName) {
  try {
    const listResult = await listDeployments(1);
    if (!listResult.success || listResult.deployments.length === 0) {
      return {
        success: false,
        error: 'No previous deployments found'
      };
    }
    
    const latestDeployment = listResult.deployments[0];
    const headers = await getVercelHeaders();
    
    let url = `${VERCEL_API}/v13/deployments?forceNew=1&skipAutoDetectionConfirmation=1`;
    if (settings.vercel_team_id) {
      url += `&teamId=${settings.vercel_team_id}`;
    }
    
    const payload = {
      name: projectName || latestDeployment.name,
      deploymentId: latestDeployment.uid,
      projectSettings: {
        framework: null,
        buildCommand: null,
        outputDirectory: null,
        installCommand: null,
        devCommand: null
      },
      target: 'production'
    };
    
    const response = await axios.post(url, payload, { headers });
    return {
      success: true,
      deployment: response.data,
      url: response.data.url
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.error?.message || error.message
    };
  }
}

async function checkVercelToken() {
  try {
    const headers = await getVercelHeaders();
    const response = await axios.get(`${VERCEL_API}/v2/user`, { headers });
    return {
      success: true,
      user: {
        username: response.data.user.username,
        email: response.data.user.email,
        name: response.data.user.name
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.error?.message || error.message
    };
  }
}

async function deleteProject(projectId) {
  try {
    const headers = await getVercelHeaders();
    let url = `${VERCEL_API}/v9/projects/${projectId}`;
    
    if (settings.vercel_team_id) {
      url += `?teamId=${settings.vercel_team_id}`;
    }
    
    await axios.delete(url, { headers });
    return {
      success: true,
      message: `Project ${projectId} deleted successfully`
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.error?.message || error.message
    };
  }
}

async function deleteAllProjects() {
  try {
    const listResult = await listProjects();
    if (!listResult.success) {
      return {
        success: false,
        error: listResult.error
      };
    }
    
    if (listResult.projects.length === 0) {
      return {
        success: true,
        message: 'No projects to delete',
        deleted: 0
      };
    }
    
    let deleted = 0;
    let failed = 0;
    const errors = [];
    
    for (const project of listResult.projects) {
      const deleteResult = await deleteProject(project.id);
      if (deleteResult.success) {
        deleted++;
      } else {
        failed++;
        errors.push(`${project.name}: ${deleteResult.error}`);
      }
    }
    
    return {
      success: true,
      message: `Deleted ${deleted} projects, ${failed} failed`,
      deleted: deleted,
      failed: failed,
      errors: errors
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

function getSupportedFrameworks() {
  return Object.entries(SUPPORTED_FRAMEWORKS).map(([key, value]) => ({
    key,
    name: value.name,
    configFiles: value.configFiles || [],
    detectBy: value.detectBy || []
  }));
}

module.exports = {
  listDeployments,
  getDeployment,
  createDeployment,
  deployFromGit,
  deleteDeployment,
  listProjects,
  getProject,
  redeployLatest,
  checkVercelToken,
  deleteProject,
  deleteAllProjects,
  extractZipWithStructure,
  processFilesWithStructure,
  detectFramework,
  getSupportedFrameworks,
  isTextFile,
  isBinaryFile,
  isAllowedFile,
  SUPPORTED_FRAMEWORKS,
  TEXT_EXTENSIONS,
  BINARY_EXTENSIONS,
  ALLOWED_EXTENSIONS
};
