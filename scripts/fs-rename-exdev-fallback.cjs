const fs = require("node:fs");
const path = require("node:path");

function copyAcrossDevices(source, dest, callback) {
  fs.mkdir(path.dirname(dest), { recursive: true }, (mkdirErr) => {
    if (mkdirErr) {
      callback(mkdirErr);
      return;
    }

    fs.copyFile(source, dest, (copyErr) => {
      if (copyErr) {
        callback(copyErr);
        return;
      }
      fs.unlink(source, callback);
    });
  });
}

const originalRename = fs.rename.bind(fs);
const originalRenameSync = fs.renameSync.bind(fs);
const originalPromisesRename = fs.promises.rename.bind(fs.promises);

fs.rename = (oldPath, newPath, callback) => {
  originalRename(oldPath, newPath, (error) => {
    if (error && error.code === "EXDEV") {
      copyAcrossDevices(oldPath, newPath, callback);
      return;
    }
    callback(error);
  });
};

fs.renameSync = (oldPath, newPath) => {
  try {
    originalRenameSync(oldPath, newPath);
  } catch (error) {
    if (error && error.code === "EXDEV") {
      fs.mkdirSync(path.dirname(newPath), { recursive: true });
      fs.copyFileSync(oldPath, newPath);
      fs.unlinkSync(oldPath);
      return;
    }
    throw error;
  }
};

fs.promises.rename = async (oldPath, newPath) => {
  try {
    await originalPromisesRename(oldPath, newPath);
  } catch (error) {
    if (!error || error.code !== "EXDEV") {
      throw error;
    }
    await fs.promises.mkdir(path.dirname(newPath), { recursive: true });
    await fs.promises.copyFile(oldPath, newPath);
    await fs.promises.unlink(oldPath);
  }
};
