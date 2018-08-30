// default node packages
const fs = require("fs");
const path = require("path");
// third party
// Menu was used to make sendActionToFirstResponder call: which doesn't seem to have any effect.
// globalShortcut is used to register the shortcut, then insdie the handler, trigger the showWindow of
// menubar instance.
const { Menu, globalShortcut } = require("electron");
// auto updater: that's all you gotta know for now.
const autoUpdater = require("electron-updater").autoUpdater;

// object C bridging library,
const objc = require("objc");
const stringSimilarity = require("string-similarity");
const menubar = require("menubar");
// a wrapper around electron-setting, could be useful when you want to deal with
// setting related stuff.
const setting = require("./setting");
// variables
const assetsDirectory = path.join(__dirname, "assets");
const shortcutsDirectory = path.join(__dirname, "shortcuts");
// The menu bar handles the click and blur event pretty nicely, you might
// want to imp those functionalities by yourself.
const mb = menubar({
  index: 'file://' + path.join(__dirname, "window_template.html"), // customize the index page name
  icon: path.join(__dirname, "/assets/icon.png"),
  width: 300,
  height: 400,
  resizable: false,
  showDockIcon: false,
  preloadWindow: true, // why we need to preoad window again?
  // windowPosition: 'center'
  // showOnRightClick: true,
  showOnAllWorkspaces: false,
  // x: 300,
  // y: 400
});

// setup objc bridge, so that previous app's name could be fetched.
objc.import("AppKit");
const { NSWorkspace, js } = objc;

// using the objcs bridging lib to get the frontmostApplication name
function getCurrentApp() {
  const currentAppProxy = NSWorkspace.sharedWorkspace()
    .frontmostApplication()
    .localizedName();
  return js(currentAppProxy);
}

// this function is not being used.
function hasShortcut() {
  const availableShortcuts = fs.readdirSync(shortcutsDirectory);
  const matches = stringSimilarity.findBestMatch(
    getCurrentApp(),
    availableShortcuts
  );
  return matches.bestMatch.rating > 0.5 ? true : false;
}

// wrapper around menubar show/hide window function
// used in the global shortcut invocation
function toggleWindow() {
  mb.window.isVisible() ? mb.hideWindow() : mb.showWindow();
}

// event handler for menubar ready event
// doesn't need to be a named function here
// what it does: {
//   1. show devtools when in debug mode
//   2. checks for updates
//   3. register global shortcut to invoke the menubar app
// }
mb.on("ready", function ready() {
  // mb.window.webContents.toggleDevTools();
  autoUpdater.checkForUpdatesAndNotify();
  globalShortcut.register(
    `${setting.getKeymodifier()}+${setting.getKeycode()}`,
    toggleWindow
  );
});

// on menubar show, fetch previous app and display all
// possible shortcuts rightaway: this doesn't have to be
// the search event yet
mb.on("show", () => {
  // actually it's: get the previous ap right before
  // invoking this app
  const currentApp = getCurrentApp();
  // this is basically the query params to look up
  // if there is a match
  const currentAppFile = `${currentApp}.yml`;
  // ***menubar already does this.
  // mb.tray.setHighlightMode("always");

  // try to test the accessibility of the current file,
  // if no error/exception would be thrown, send the app file name
  // via the webContents.send method, then listen for this message via
  // ipcRenderer in the renderer file.
  fs.access(
    path.join(shortcutsDirectory, currentAppFile),
    // only checks for read access
    fs.constants.R_OK,
    err => {
      if (err) {
        mb.window.webContents.send("noShortcuts", currentApp);
      } else {
        // this actually doesn't render anything within the window,
        // this is just sending the file name via ipcRenderer
        mb.window.webContents.send("currentApp", currentAppFile);
      }
    }
  );
});

// the hide event handler actually doesn't have any effect.
// it seems the default behavior will handle it properly?
// ** Update: menubar handles the blue event and hide the window && update the tray highlight
//  properly
mb.on("hide", () => {
  // console.log('it is gone');
  // mb.tray.setHighlightMode("never"); // this line actually has no effect
  // Menu.sendActionToFirstResponder("hide:"); // what does this line do?
});


// before quiting, unregister the short cut
mb.app.on("will-quit", () => {
  globalShortcut.unregisterAll();
  mb.app.quit();
});
