//@ts-nocheck
import path from 'path';
import { app, BrowserWindow, shell, ipcMain } from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import MenuBuilder from './menu';
import { resolveHtmlPath } from './util';
import { exec } from 'child_process';

import {
  addPriorityDefault,
  changePriority,
  getPriorities,
} from './functions/priorities';

import { createFiles } from './functions/createJSON';

const fs = require('fs');

const aepPath = path.join(__dirname, '../../assets/projects');
const pinnedPath = path.join(
  __dirname,
  '../../assets/json/pinned-projects.json',
);
const prioritiesPath = path.join(
  __dirname,
  '../../assets/json/project-priorities.json',
);
const projectsPath = path.join(__dirname, '../../assets/json/projects.json');
const recentlyUsedPath = path.join(
  __dirname,
  '../../assets/json/recently-used-projects.json',
);
const templatePath = path.join(__dirname, '../../assets/template/template.aep');

// Creates necessary JSON files if they don't already exist in the directory.
createFiles(
  pinnedPath,
  prioritiesPath,
  projectsPath,
  recentlyUsedPath,
  aepPath,
);

class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();
  }
}

let mainWindow: BrowserWindow | null = null;

// Get file path

ipcMain.on('rename-project', async (event, args) => {
  let oldName = args[0];
  let newName = args[1];

  // Rename from pinned-projects.json
  try {
    let read = fs.readFileSync(pinnedPath, 'utf-8');
    let json = JSON.parse(read);

    json[newName] = json[oldName];
    delete json[oldName];
    try {
      let newJSON = JSON.stringify(json);
      fs.writeFileSync(pinnedPath, newJSON);
    } catch (error) {}
  } catch (error) {
    console.error(error);
  }

  // Rename from File
  try {
    fs.renameSync(aepPath + '\\' + oldName, aepPath + '\\' + newName);
  } catch (error) {
    console.error(error);
  }

  try {
    fs.renameSync(
      aepPath + '\\' + newName + '\\' + oldName + '.aep',
      aepPath + '\\' + newName + '\\' + newName + '.aep',
    );
  } catch (error) {
    console.error(error);
  }

  // Delete from projects.json
  try {
    let read = fs.readFileSync(projectsPath, 'utf-8');
    let json = JSON.parse(read);
    json[newName] = json[oldName];
    delete json[oldName];
    json[newName].name = newName;

    try {
      let newJSON = JSON.stringify(json);
      fs.writeFileSync(projectsPath, newJSON);
    } catch (error) {}
  } catch (error) {
    console.error(error);
  }

  // Delete from project-priorities.json

  try {
    let read = fs.readFileSync(prioritiesPath, 'utf-8');
    let json = JSON.parse(read);
    json[newName] = json[oldName];

    delete json[oldName];

    try {
      let newJSON = JSON.stringify(json);
      fs.writeFileSync(prioritiesPath, newJSON);
    } catch (error) {}
  } catch (error) {
    console.error(error);
  }

  // Delete from recently-used-projects.json

  // Read
  try {
    let jsonArray = [];
    const data = fs.readFileSync(recentlyUsedPath, 'utf-8');
    // Parse
    try {
      jsonArray = JSON.parse(data);
    } catch (error) {
      console.error('Error parsing JSON:', error);
      return;
    }

    // Delete
    for (var i = 0; i < jsonArray.length; i++) {
      if (jsonArray[i].name === args[0]) {
        jsonArray[i].name = args[1];
      }
    }

    // Write
    fs.writeFile(
      recentlyUsedPath,
      JSON.stringify(jsonArray),
      'utf-8',
      (err: any) => {
        if (err) {
          console.error('Error with writing file: ', err);
          return;
        }
      },
    );
  } catch (error) {}
});
ipcMain.on('get-pinned', async (event, args) => {
  try {
    let data = fs.readFileSync(pinnedPath, 'utf-8');

    try {
      data = JSON.parse(data);
    } catch (error) {}

    event.reply('get-pinned', data);
  } catch (error) {
    console.error('error with reading file, ', error);
  }
});
ipcMain.on('add-pinned', async (event, args) => {
  let name = args[0];
  console.log(name);

  try {
    fs.readFile(pinnedPath, 'utf-8', (err, data) => {
      if (err) {
        console.error(err);
        return;
      }

      try {
        data = JSON.parse(data);
      } catch {
        data = {};
      }

      if (!data.hasOwnProperty(name)) {
        data[name] = {};
      } else {
        console.log(name + 'project is pinned already');
        delete data[name];
      }

      fs.writeFile(pinnedPath, JSON.stringify(data), (err) => {
        if (err) console.error('Error with writing properties file', error);
        else {
          console.log('Succesfully wrote ' + name + ' to pinned-projects.json');
          event.reply('add-pinned', 'success');
        }
      });
    });
  } catch (error) {
    console.error('error with reading file, ', error);
  }
});

ipcMain.on('get-recent-projects', async (event, args) => {
  // get file
  try {
    fs.readFile(recentlyUsedPath, 'utf-8', (err, data) => {
      if (err) {
        console.error(err);
        return;
      }

      let json;
      try {
        json = JSON.parse(data);
      } catch (error) {
        console.error(error);
      }

      console.log(json);
      event.reply('get-recent-projects', json);
    });
  } catch (error) {
    console.error(error);
  }
});
ipcMain.on('delete-project', async (event, args) => {
  console.log('delete project');

  // Delete from
  try {
    let read = fs.readFileSync(pinnedPath, 'utf-8');
    let json = JSON.parse(read);
    delete json[args[0]];

    try {
      let newJSON = JSON.stringify(json);
      fs.writeFileSync(pinnedPath, newJSON);
    } catch (error) {}
  } catch (error) {
    console.error(error);
  }

  // Delete from File
  try {
    fs.rmdirSync(aepPath + '\\' + args[0], {
      recursive: true,
      force: true,
    });
  } catch (error) {
    console.error(error);
  }

  // Delete from projects.json
  try {
    let read = fs.readFileSync(projectsPath, 'utf-8');
    let json = JSON.parse(read);
    delete json[args[0]];

    try {
      let newJSON = JSON.stringify(json);
      fs.writeFileSync(projectsPath, newJSON);
    } catch (error) {}
  } catch (error) {
    console.error(error);
  }

  // Delete from project-priorities.json
  //
  //
  try {
    let read = fs.readFileSync(prioritiesPath, 'utf-8');
    let json = JSON.parse(read);
    delete json[args[0]];

    try {
      let newJSON = JSON.stringify(json);
      fs.writeFileSync(prioritiesPath, newJSON);
    } catch (error) {}
  } catch (error) {
    console.error(error);
  }

  // Delete from recently-used-projects.json
  //
  //
  // Read
  try {
    let jsonArray = [];
    const data = fs.readFileSync(recentlyUsedPath, 'utf-8');
    // Parse
    try {
      jsonArray = JSON.parse(data);
    } catch (error) {
      console.error('Error parsing JSON:', error);
      return;
    }

    // Delete
    for (var i = 0; i < jsonArray.length; i++) {
      if (jsonArray[i].name === args[0]) {
        jsonArray.splice(i, 1);

        i = jsonArray.length;
      }
    }

    // Write
    fs.writeFile(
      recentlyUsedPath,
      JSON.stringify(jsonArray),
      'utf-8',
      (err: any) => {
        if (err) {
          console.error('Error with writing file: ', err);
          return;
        }
      },
    );
  } catch (error) {}
});
ipcMain.on('set-priority', async (event, args) => {
  changePriority(args);
});

ipcMain.on('get-priorities', async (event) => {
  let json = getPriorities();
  event.reply('get-priorities', json);
});

// Returns projects.json to frontend
ipcMain.on('get-projects', async (event) => {
  try {
    let read = fs.readFileSync(projectsPath, 'utf-8');

    let json = JSON.parse(read);
    event.reply('get-projects', json);
  } catch (err) {
    console.log(err);
  }
});

// Updates the projects.json with names in the file directory
ipcMain.on('update-projects', async (event, arg) => {
  let jsonObj: { [key: string]: { name: String; date: any } } = {};
  // read from directory
  try {
    let fileList = fs.readdirSync(aepPath);

    fileList.forEach((obj: { name: String }) => {
      let statsObj = fs.statSync(aepPath + '\\' + obj);
      let aep = fs.statSync(aepPath + '\\' + obj + '\\' + obj + '.aep');
      jsonObj[obj.toString()] = {
        name: obj,
        date: statsObj.birthtime,
        fileSize: aep.size / (1024 * 1024),
      };

      // Add
    });

    // write to json
    try {
      let newJSON = JSON.stringify(jsonObj);
      fs.writeFileSync(projectsPath, newJSON);
    } catch (error) {}
  } catch (error) {
    console.log(error);
  }
});

ipcMain.on('open-aep', async (event, folderName) => {
  folderName = aepPath + '\\' + folderName + '\\' + folderName + '.aep';
  const command =
    process.platform === 'darwin'
      ? `open "${folderName}"`
      : process.platform === 'win32'
      ? `start "" "${folderName}"`
      : process.platform === 'linux'
      ? `xdg-open "${folderName}"`
      : null;

  if (command) {
    exec(command, (error) => {
      if (error) {
        console.error(`Error opening After Effects project: ${error}`);
      }
    });
  } else {
    console.error('Unsupported operating system');
  }
});

function addRecentAEP(fileName) {
  // Add to recently used/created

  // initialize array
  let jsonArray = [];

  // read json
  const data = fs.readFileSync(recentlyUsedPath, 'utf-8');

  // parse json
  try {
    jsonArray = JSON.parse(data);
  } catch (error) {
    console.error('Error parsing JSON:', error);
    jsonArray = [];
  }

  // debug
  console.log('array length: ' + jsonArray.length);

  // loop array check for name

  var nameExists = false;
  const currentDate = new Date();

  const hour = currentDate.toLocaleString([], {
    hour: 'numeric',
    minute: 'numeric',
  });
  const month = currentDate.getUTCMonth() + 1;
  const day = currentDate.getUTCDate();
  const year = currentDate.getUTCFullYear();
  const newDate = `${hour} ${month}/${day}/${year}`;

  for (var i = 0; i < jsonArray.length; i++) {
    if (jsonArray[i].name === fileName) {
      console.log('nameExits = true');
      nameExists = true;
      jsonArray.splice(i, 1);
      jsonArray.push({ name: fileName, date: newDate });

      i = jsonArray.length; // exit loop
    }
  }

  if (!nameExists) {
    // remove LRU index
    if (jsonArray.length == 12) {
      jsonArray.splice(0, 1);
    }

    jsonArray.push({ name: fileName, date: newDate });
  }

  fs.writeFile(
    recentlyUsedPath,
    JSON.stringify(jsonArray),
    'utf-8',
    (err: any) => {
      if (err) {
        console.error('Error with writing file: ', err);
        return;
      }
    },
  );
}
ipcMain.on('add-recent-aep', async (event, fileName) => {
  addRecentAEP(fileName);
});
ipcMain.on('create-aep', async (event, fileName) => {
  var newDirective = aepPath + '\\' + fileName;

  // Create new folder
  try {
    if (!fs.existsSync(newDirective)) {
      fs.mkdirSync(newDirective);
    } else {
      console.error('File already exists!');
    }
  } catch (err) {
    return;
  }

  // Make aep in the folder with the same name as the folder

  try {
    fs.copyFileSync(templatePath, newDirective + '\\' + fileName + '.aep');
  } catch (err) {
    console.log(err);
  }

  // Add to recently used/created

  addRecentAEP(fileName);
  addPriorityDefault(fileName);
});

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

const isDebug =
  process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

if (isDebug) {
  require('electron-debug')();
}

const installExtensions = async () => {
  const installer = require('electron-devtools-installer');
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ['REACT_DEVELOPER_TOOLS'];

  return installer
    .default(
      extensions.map((name) => installer[name]),
      forceDownload,
    )
    .catch(console.log);
};

const createWindow = async () => {
  if (isDebug) {
    await installExtensions();
  }

  const RESOURCES_PATH = app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(__dirname, '../../assets');

  const getAssetPath = (...paths: string[]): string => {
    return path.join(RESOURCES_PATH, ...paths);
  };

  mainWindow = new BrowserWindow({
    show: false,
    minHeight: 720,
    minWidth: 1280,

    icon: getAssetPath('icon.png'),
    webPreferences: {
      preload: app.isPackaged
        ? path.join(__dirname, 'preload.js')
        : path.join(__dirname, '../../.erb/dll/preload.js'),
    },
  });
  mainWindow.setMenuBarVisibility(false);

  mainWindow.loadURL(resolveHtmlPath('index.html'));
  mainWindow.maximize();

  mainWindow.on('ready-to-show', () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    if (process.env.START_MINIMIZED) {
      mainWindow.minimize();
    } else {
      mainWindow.show();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  const menuBuilder = new MenuBuilder(mainWindow);
  menuBuilder.buildMenu();

  // Open urls in the user's browser
  mainWindow.webContents.setWindowOpenHandler((edata) => {
    shell.openExternal(edata.url);
    return { action: 'deny' };
  });

  // Remove this if your app does not use auto updates
  // eslint-disable-next-line
  new AppUpdater();
};

/**
 * Add event listeners...
 */

app.on('window-all-closed', () => {
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app
  .whenReady()
  .then(() => {
    createWindow();
    app.on('activate', () => {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (mainWindow === null) createWindow();
    });
  })
  .catch(console.log);
