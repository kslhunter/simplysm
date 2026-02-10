package kr.co.simplysm.cordova.fs;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.Settings;
import android.util.Base64;

import androidx.core.content.ContextCompat;
import androidx.core.content.FileProvider;

import org.apache.cordova.CallbackContext;
import org.apache.cordova.CordovaPlugin;
import org.apache.cordova.LOG;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.nio.charset.StandardCharsets;

public class CordovaFileSystem extends CordovaPlugin {

    @Override
    public boolean execute(String action, JSONArray args, CallbackContext callbackContext) {
        try {
            LOG.d("CordovaFileSystem", "Executing action: " + action);

            switch (action) {
                case "checkPermission":
                    handleCheckPermission(callbackContext);
                    return true;
                case "requestPermission":
                    handleRequestPermission(callbackContext);
                    return true;
                case "readdir":
                    handleReadDir(args, callbackContext);
                    return true;
                case "getStoragePath":
                    handleGetStoragePath(args, callbackContext);
                    return true;
                case "getFileUri":
                    handleGetFileUri(args, callbackContext);
                    return true;
                case "writeFileString":
                    handleWriteFileString(args, callbackContext);
                    return true;
                case "writeFileBase64":
                    handleWriteFileBase64(args, callbackContext);
                    return true;
                case "readFileString":
                    handleReadFileString(args, callbackContext);
                    return true;
                case "readFileBase64":
                    handleReadFileBase64(args, callbackContext);
                    return true;
                case "remove":
                    handleRemove(args, callbackContext);
                    return true;
                case "mkdirs":
                    handleMkdirs(args, callbackContext);
                    return true;
                case "exists":
                    handleExists(args, callbackContext);
                    return true;
                default:
                    callbackContext.error("Unknown action: " + action);
                    return false;
            }
        } catch (Exception e) {
            LOG.e("CordovaFileSystem", "Error occurred while executing action: " + action, e);
            callbackContext.error("Error: " + e.getClass().getSimpleName() + " - " + e.getMessage());
            return false;
        }
    }

    // ---- Action Handlers ----

    private void handleCheckPermission(CallbackContext callbackContext) {
        cordova.getThreadPool().execute(() -> {
            Context context = cordova.getContext();
            boolean granted;

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                granted = Environment.isExternalStorageManager();
            } else {
                boolean readGranted = ContextCompat.checkSelfPermission(context, Manifest.permission.READ_EXTERNAL_STORAGE) == PackageManager.PERMISSION_GRANTED;
                boolean writeGranted = ContextCompat.checkSelfPermission(context, Manifest.permission.WRITE_EXTERNAL_STORAGE) == PackageManager.PERMISSION_GRANTED;
                granted = readGranted && writeGranted;
            }

            callbackContext.success(granted ? "true" : "false");
        });
    }

    private void handleRequestPermission(CallbackContext callbackContext) {
        cordova.getThreadPool().execute(() -> {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                if (!Environment.isExternalStorageManager()) {
                    Intent intent = new Intent(Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION);
                    intent.setData(Uri.parse("package:" + cordova.getContext().getPackageName()));
                    cordova.getActivity().startActivity(intent);
                }
                callbackContext.success();
            } else {
                cordova.requestPermissions(this, 1001, new String[]{
                        Manifest.permission.READ_EXTERNAL_STORAGE,
                        Manifest.permission.WRITE_EXTERNAL_STORAGE
                });
                callbackContext.success();
            }
        });
    }

    private void handleReadDir(JSONArray args, CallbackContext callbackContext) throws JSONException {
        final String path = args.getString(0);

        cordova.getThreadPool().execute(() -> {
            File dir = new File(path);
            if (!dir.exists() || !dir.isDirectory()) {
                callbackContext.error("Directory does not exist or is not a directory.");
                return;
            }
            File[] files = dir.listFiles();
            if (files == null) {
                callbackContext.error("Permission denied or directory not readable.");
                return;
            }
            JSONArray result = new JSONArray();
            for (File file : files) {
                JSONObject fileInfo = new JSONObject();
                try {
                    fileInfo.put("name", file.getName());
                    fileInfo.put("isDirectory", file.isDirectory());
                } catch (JSONException e) {
                    // ignore single error
                }
                result.put(fileInfo);
            }
            callbackContext.success(result);
        });
    }

    private void handleGetStoragePath(JSONArray args, CallbackContext callbackContext) throws JSONException {
        final String type = args.getString(0);

        cordova.getThreadPool().execute(() -> {
            Context context = cordova.getActivity().getApplicationContext();
            File path;
            switch (type) {
                case "external":
                    path = Environment.getExternalStorageDirectory();
                    break;
                case "externalFiles":
                    path = context.getExternalFilesDir(null);
                    break;
                case "externalCache":
                    path = context.getExternalCacheDir();
                    break;
                case "externalMedia":
                    File[] mediaDirs = context.getExternalMediaDirs();
                    path = (mediaDirs.length > 0 && mediaDirs[0] != null) ? mediaDirs[0] : null;
                    break;
                case "appData":
                    path = new File(context.getApplicationInfo().dataDir);
                    break;
                case "appFiles":
                    path = context.getFilesDir();
                    break;
                case "appCache":
                    path = context.getCacheDir();
                    break;
                default:
                    callbackContext.error("Unknown storage type: " + type);
                    return;
            }
            if (path != null) {
                callbackContext.success(path.getAbsolutePath());
            } else {
                callbackContext.error("Path not available for type: " + type);
            }
        });
    }

    private void handleGetFileUri(JSONArray args, CallbackContext callbackContext) throws JSONException {
        final String fullPath = args.getString(0);
        final File file = new File(fullPath);

        cordova.getThreadPool().execute(() -> {
            Context context = cordova.getContext();
            String authority = context.getPackageName() + ".fs.provider";

            try {
                Uri fileUri = FileProvider.getUriForFile(context, authority, file);
                callbackContext.success(fileUri.toString());
            } catch (Exception e) {
                LOG.e("CordovaFileSystem", "getFileUri failed", e);
                callbackContext.error("getFileUri failed: " + e.getClass().getSimpleName() + " - " + e.getMessage());
            }
        });
    }

    private void handleWriteFileString(JSONArray args, CallbackContext callbackContext) throws JSONException {
        final String filePath = args.getString(0);
        final String content = args.getString(1);

        cordova.getThreadPool().execute(() -> {
            File file = new File(filePath);
            File parent = file.getParentFile();
            if (parent != null && !parent.exists()) parent.mkdirs();
            try (BufferedOutputStream bos = new BufferedOutputStream(new FileOutputStream(file, false))) {
                bos.write(content.getBytes(StandardCharsets.UTF_8));
                callbackContext.success("String written successfully");
            } catch (Exception e) {
                LOG.e("CordovaFileSystem", "writeFileString failed", e);
                callbackContext.error("Write failed: " + e.getClass().getSimpleName() + " - " + e.getMessage());
            }
        });
    }

    private void handleWriteFileBase64(JSONArray args, CallbackContext callbackContext) throws JSONException {
        final String filePath = args.getString(0);
        final String base64Data = args.getString(1);

        cordova.getThreadPool().execute(() -> {
            try {
                byte[] decoded = Base64.decode(base64Data, Base64.DEFAULT);
                File file = new File(filePath);
                File parent = file.getParentFile();
                if (parent != null && !parent.exists()) parent.mkdirs();
                try (BufferedOutputStream bos = new BufferedOutputStream(new FileOutputStream(file, false))) {
                    bos.write(decoded);
                    callbackContext.success("Binary file written successfully");
                }
            } catch (Exception e) {
                LOG.e("CordovaFileSystem", "writeFileBase64 failed", e);
                callbackContext.error("Write failed: " + e.getClass().getSimpleName() + " - " + e.getMessage());
            }
        });
    }

    private void handleReadFileString(JSONArray args, CallbackContext callbackContext) throws JSONException {
        final String filePath = args.getString(0);

        cordova.getThreadPool().execute(() -> {
            File file = new File(filePath);
            if (!file.exists() || !file.isFile()) {
                callbackContext.error("File not found: " + filePath);
                return;
            }
            try (BufferedInputStream bis = new BufferedInputStream(new FileInputStream(file));
                 ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
                byte[] buffer = new byte[8192];
                int bytesRead;
                while ((bytesRead = bis.read(buffer)) != -1) {
                    baos.write(buffer, 0, bytesRead);
                }
                String content = baos.toString("UTF-8");
                callbackContext.success(content);
            } catch (Exception e) {
                LOG.e("CordovaFileSystem", "readFileString failed", e);
                callbackContext.error("Read failed: " + e.getClass().getSimpleName() + " - " + e.getMessage());
            }
        });
    }

    private void handleReadFileBase64(JSONArray args, CallbackContext callbackContext) throws JSONException {
        final String filePath = args.getString(0);

        cordova.getThreadPool().execute(() -> {
            File file = new File(filePath);
            if (!file.exists() || !file.isFile()) {
                callbackContext.error("File not found: " + filePath);
                return;
            }

            try (BufferedInputStream bis = new BufferedInputStream(new FileInputStream(file));
                 ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
                byte[] buffer = new byte[8192];
                int bytesRead;
                while ((bytesRead = bis.read(buffer)) != -1) {
                    baos.write(buffer, 0, bytesRead);
                }
                String base64 = Base64.encodeToString(baos.toByteArray(), Base64.NO_WRAP);
                callbackContext.success(base64);
            } catch (Exception e) {
                LOG.e("CordovaFileSystem", "readFileBase64 failed", e);
                callbackContext.error("Read failed: " + e.getClass().getSimpleName() + " - " + e.getMessage());
            }
        });
    }

    private void handleRemove(JSONArray args, CallbackContext callbackContext) throws JSONException {
        final String filePath = args.getString(0);

        cordova.getThreadPool().execute(() -> {
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
        });
    }

    private void handleMkdirs(JSONArray args, CallbackContext callbackContext) throws JSONException {
        final String dirPath = args.getString(0);

        cordova.getThreadPool().execute(() -> {
            File dir = new File(dirPath);
            if (dir.exists()) {
                callbackContext.success("Already exists");
                return;
            }
            boolean created = dir.mkdirs();
            if (created) {
                callbackContext.success("Directory created");
            } else {
                callbackContext.error("Failed to create directory");
            }
        });
    }

    private void handleExists(JSONArray args, CallbackContext callbackContext) throws JSONException {
        final String path = args.getString(0);

        cordova.getThreadPool().execute(() -> {
            File target = new File(path);
            boolean exists = target.exists();
            callbackContext.success(exists ? "true" : "false");
        });
    }

    // 재귀 삭제 유틸
    private boolean deleteRecursively(File file) {
        if (file.isDirectory()) {
            File[] children = file.listFiles();
            if (children != null) {
                for (File child : children) {
                    if (!deleteRecursively(child)) {
                        LOG.w("CordovaFileSystem", "Failed to delete: " + child.getAbsolutePath());
                        return false;
                    }
                }
            }
        }
        boolean deleted = file.delete();
        if (!deleted) {
            LOG.w("CordovaFileSystem", "Failed to delete: " + file.getAbsolutePath());
        }
        return deleted;
    }
}
