
package kr.co.simplysm.cordova;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.Settings;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import android.content.Context;
import android.os.Environment;
import android.util.Base64;

import org.apache.cordova.*;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.file.Files;

public class CordovaFileSystem extends CordovaPlugin {
  @Override
  public boolean execute(String action, JSONArray args, CallbackContext callbackContext) throws JSONException {
    try {
      LOG.d("CordovaFileSystem", "Executing action: " + action);

      if ("checkPermission".equals(action)) {
        Context context = cordova.getContext();

        boolean readGranted = ContextCompat.checkSelfPermission(context, Manifest.permission.READ_EXTERNAL_STORAGE) == PackageManager.PERMISSION_GRANTED;
        boolean writeGranted = ContextCompat.checkSelfPermission(context, Manifest.permission.WRITE_EXTERNAL_STORAGE) == PackageManager.PERMISSION_GRANTED;

        boolean manageGranted = true;
        if (android.os.Build.VERSION.SDK_INT >= 30) {
          manageGranted = Environment.isExternalStorageManager();
        }

        boolean granted = (readGranted && writeGranted) || manageGranted;
        callbackContext.success(granted ? "true" : "false");
        return true;
      }
      else if ("requestPermission".equals(action)) {
        if (android.os.Build.VERSION.SDK_INT >= 30) {
          if (!Environment.isExternalStorageManager()) {
            Intent intent = new Intent(Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION);
            intent.setData(Uri.parse("package:" + cordova.getContext().getPackageName()));
            cordova.getActivity().startActivity(intent);
          }
          callbackContext.success("requested");
          return true;
        }

        // Android 10 이하 권한 요청
        cordova.requestPermissions(this, 1001, new String[] {
          Manifest.permission.READ_EXTERNAL_STORAGE,
          Manifest.permission.WRITE_EXTERNAL_STORAGE
        });
        callbackContext.success("requested");
        return true;
      }
      else if ("readdir".equals(action)) {
        String path = args.getString(0);
        File dir = new File(path);

        if (!dir.exists() || !dir.isDirectory()) {
          callbackContext.error("Directory does not exist or is not a directory.");
          return true;
        }

        File[] files = dir.listFiles();
        if (files == null) {
          callbackContext.error("Permission denied or directory not readable.");
          return true;
        }

        JSONArray result = new JSONArray();
        for (File file : files) {
          JSONObject fileInfo = new JSONObject();
          fileInfo.put("name", file.getName());
          fileInfo.put("isDirectory", file.isDirectory());
          result.put(fileInfo);
        }

        callbackContext.success(result);
        return true;
      }
      else if ("getStoragePath".equals(action)) {
        String type = args.getString(0);
        Context context = cordova.getActivity().getApplicationContext();
        File path;

        switch (type) {
          case "external":
            path = Environment.getExternalStorageDirectory();
            break;
          case "app":
            path = context.getFilesDir(); // 앱 내부 저장소
            break;
          case "appCache":
            path = context.getCacheDir();
            break;
          case "externalCache":
            path = context.getExternalCacheDir();
            break;
          default:
            callbackContext.error("Unknown storage type: " + type);
            return true;
        }

        if (path != null) {
          callbackContext.success(path.getAbsolutePath());
        } else {
          callbackContext.error("Path not available for type: " + type);
        }
        return true;
      }

      else if ("writeFileString".equals(action)) {
        String filePath = args.getString(0);
        String content = args.getString(1);

        try {
          File file = new File(filePath);
          File parent = file.getParentFile();
          if (parent != null && !parent.exists()) parent.mkdirs();

          FileOutputStream fos = new FileOutputStream(file, false);
          fos.write(content.getBytes("UTF-8"));
          fos.close();

          callbackContext.success("String written successfully");
        } catch (Exception e) {
          LOG.e("CordovaFileSystem", "writeFileString failed", e);
          callbackContext.error("Write failed: " + e.getClass().getSimpleName() + " - " + e.getMessage());
        }
        return true;
      }

      else if ("writeFileBase64".equals(action)) {
        String filePath = args.getString(0);
        String base64Data = args.getString(1);

        try {
          byte[] decoded = android.util.Base64.decode(base64Data, android.util.Base64.DEFAULT);

          File file = new File(filePath);
          File parent = file.getParentFile();
          if (parent != null && !parent.exists()) parent.mkdirs();

          FileOutputStream fos = new FileOutputStream(file, false);
          fos.write(decoded);
          fos.close();

          callbackContext.success("Binary file written successfully");
        } catch (Exception e) {
          LOG.e("CordovaFileSystem", "writeFileBase64 failed", e);
          callbackContext.error("Write failed: " + e.getClass().getSimpleName() + " - " + e.getMessage());
        }
        return true;
      }

      else if ("readFileString".equals(action)) {
        String filePath = args.getString(0);
        File file = new File(filePath);

        if (!file.exists() || !file.isFile()) {
          callbackContext.error("File not found: " + filePath);
          return true;
        }

        try {
          byte[] bytes = java.nio.file.Files.readAllBytes(file.toPath());
          String content = new String(bytes, "UTF-8");
          callbackContext.success(content);
        } catch (Exception e) {
          LOG.e("CordovaFileSystem", "readFileString failed", e);
          callbackContext.error("Read failed: " + e.getClass().getSimpleName() + " - " + e.getMessage());
        }
        return true;
      }

      else if ("readFileBase64".equals(action)) {
        String filePath = args.getString(0);
        File file = new File(filePath);

        if (!file.exists() || !file.isFile()) {
          callbackContext.error("File not found: " + filePath);
          return true;
        }

        try {
          byte[] bytes = java.nio.file.Files.readAllBytes(file.toPath());
          String base64 = android.util.Base64.encodeToString(bytes, android.util.Base64.NO_WRAP);
          callbackContext.success(base64);
        } catch (Exception e) {
          LOG.e("CordovaFileSystem", "readFileBase64 failed", e);
          callbackContext.error("Read failed: " + e.getClass().getSimpleName() + " - " + e.getMessage());
        }
        return true;
      }

      else if ("remove".equals(action)) {
        String filePath = args.getString(0);
        File target = new File(filePath);

        try {
          boolean success = deleteRecursively(target);
          if (success) {
            callbackContext.success("Deleted successfully");
          } else {
            callbackContext.error("Deletion failed");
          }
        } catch (Exception e) {
          LOG.e("CordovaFileSystem", "remove failed", e);
          callbackContext.error("Delete failed: " + e.getClass().getSimpleName() + " - " + e.getMessage());
        }
        return true;
      }

      else if ("mkdirs".equals(action)) {
        String dirPath = args.getString(0);
        File dir = new File(dirPath);

        if (dir.exists()) {
          callbackContext.success("Already exists");
          return true;
        }

        boolean created = dir.mkdirs();
        if (created) {
          callbackContext.success("Directory created");
        } else {
          callbackContext.error("Failed to create directory");
        }
        return true;
      }

      else if ("exists".equals(action)) {
        String path = args.getString(0);
        File target = new File(path);
        boolean exists = target.exists();
        callbackContext.success(exists ? "true" : "false");
        return true;
      }

      callbackContext.error("Unknown action: " + action);
      return false;

    } catch (Exception e) {
      LOG.e("CordovaFileSystem", "Error occurred while executing action: " + action, e);
      callbackContext.error("Error: " + e.getClass().getSimpleName() + " - " + e.getMessage());
      return false;
    }
  }

  // 재귀 삭제 유틸
  private boolean deleteRecursively(File file) {
    if (file.isDirectory()) {
      File[] children = file.listFiles();
      if (children != null) {
        for (File child : children) {
          if (!deleteRecursively(child)) return false;
        }
      }
    }
    return file.delete();
  }
}
