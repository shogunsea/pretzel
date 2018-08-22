// default node packages
const fs = require("fs");
// const url = require("url");
const path = require("path");
// third party
const { Menu, globalShortcut } = require("electron");
const autoUpdater = require("electron-updater").autoUpdater;
const settings = require("electron-settings");
const objc = require("objc");
const stringSimilarity = require("string-similarity");
const menubar = require("menubar");
const setting = require("./setting");
// variables
const assetsDirectory = path.join(__dirname, "assets");
const shortcutsDirectory = path.join(__dirname, "shortcuts");
const mb = menubar({
  index: 'file://' + path.join(__dirname, "window_template.html"), // customize the index page name
  icon: path.join(__dirname, "/assets/icon.png"),
  width: 300,
  height: 400,
  resizable: false,
  showDockIcon: false,
  preloadWindow: true
});

// setup objc bridge
objc.import("AppKit");
const { NSWorkspace, js } = objc;

function getCurrentApp() {
  const currentAppProxy = NSWorkspace.sharedWorkspace()
    .frontmostApplication()
    .localizedName();
  return js(currentAppProxy);
}

function hasShortcut() {
  const availableShortcuts = fs.readdirSync(shortcutsDirectory);
  const matches = stringSimilarity.findBestMatch(
    getCurrentApp(),
    availableShortcuts
  );
  return matches.bestMatch.rating > 0.5 ? true : false;
}

function toggleWindow() {
  mb.window.isVisible() ? mb.hideWindow() : mb.showWindow();
}

mb.on("ready", function ready() {
  // mb.window.webContents.toggleDevTools();
  // settings.deleteAll();
  autoUpdater.checkForUpdatesAndNotify();
  globalShortcut.register(
    `${setting.getKeymodifier()}+${setting.getKeycode()}`,
    toggleWindow
  );
});

mb.on("show", () => {
  const currentApp = getCurrentApp();
  const currentAppFile = `${currentApp}.yml`;
  mb.tray.setHighlightMode("always");

  fs.access(
    path.join(shortcutsDirectory, currentAppFile),
    fs.constants.R_OK,
    err => {
      if (err) {
        mb.window.webContents.send("noShortcuts", currentApp);
      } else {
        // this only controls the content inside the window.
        mb.window.webContents.send("currentApp", currentAppFile);
      }
    }
  );
});

// the hide event handler actually doesn't have any effect.
// it seems the default behavior will handle it properly
mb.on("hide", () => {
  // console.log('it is gone');
  // mb.tray.setHighlightMode("never"); // this line actually has no effect
  // Menu.sendActionToFirstResponder("hide:"); // what does this line do?
});

mb.app.on("will-quit", () => {
  globalShortcut.unregisterAll();
  mb.app.quit();
});


