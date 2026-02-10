package kr.co.simplysm.capacitor.filesystem;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.Settings;
import android.util.Base64;
import android.util.Log;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.core.content.FileProvider;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.*;
import java.nio.charset.StandardCharsets;

@CapacitorPlugin(name = "FileSystem")
public class FileSystemPlugin extends Plugin {

    private static final String TAG = "FileSystemPlugin";
    private static final int PERMISSION_REQUEST_CODE = 1001;

    @PluginMethod
    public void hasPermission(PluginCall call) {
        boolean granted;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            granted = Environment.isExternalStorageManager();
        } else {
            Context ctx = getContext();
            granted = ContextCompat.checkSelfPermission(ctx, Manifest.permission.READ_EXTERNAL_STORAGE) == PackageManager.PERMISSION_GRANTED
                   && ContextCompat.checkSelfPermission(ctx, Manifest.permission.WRITE_EXTERNAL_STORAGE) == PackageManager.PERMISSION_GRANTED;
        }
        JSObject ret = new JSObject();
        ret.put("granted", granted);
        call.resolve(ret);
    }

    @PluginMethod
    public void requestPermission(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            if (!Environment.isExternalStorageManager()) {
                Intent intent = new Intent(Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION);
                intent.setData(Uri.parse("package:" + getContext().getPackageName()));
                getActivity().startActivity(intent);
            }
        } else {
            boolean readGranted = ContextCompat.checkSelfPermission(getContext(),
                Manifest.permission.READ_EXTERNAL_STORAGE) == PackageManager.PERMISSION_GRANTED;
            boolean writeGranted = ContextCompat.checkSelfPermission(getContext(),
                Manifest.permission.WRITE_EXTERNAL_STORAGE) == PackageManager.PERMISSION_GRANTED;

            if (!readGranted || !writeGranted) {
                ActivityCompat.requestPermissions(getActivity(),
                    new String[]{
                        Manifest.permission.READ_EXTERNAL_STORAGE,
                        Manifest.permission.WRITE_EXTERNAL_STORAGE
                    },
                    PERMISSION_REQUEST_CODE);
            }
        }
        call.resolve();
    }

    @PluginMethod
    public void readdir(PluginCall call) {
        String path = call.getString("path");
        if (path == null) {
            call.reject("path is required");
            return;
        }

        File dir = new File(path);
        if (!dir.exists() || !dir.isDirectory()) {
            call.reject("Directory does not exist");
            return;
        }

        File[] files = dir.listFiles();
        if (files == null) {
            call.reject("Cannot read directory");
            return;
        }

        JSArray result = new JSArray();
        for (File f : files) {
            JSObject info = new JSObject();
            info.put("name", f.getName());
            info.put("isDirectory", f.isDirectory());
            result.put(info);
        }

        JSObject ret = new JSObject();
        ret.put("files", result);
        call.resolve(ret);
    }

    @PluginMethod
    public void getStoragePath(PluginCall call) {
        String type = call.getString("type");
        if (type == null) {
            call.reject("type is required");
            return;
        }

        Context ctx = getContext();
        File path;

        switch (type) {
            case "external":
                path = Environment.getExternalStorageDirectory();
                break;
            case "externalFiles":
                path = ctx.getExternalFilesDir(null);
                break;
            case "externalCache":
                path = ctx.getExternalCacheDir();
                break;
            case "externalMedia":
                File[] dirs = ctx.getExternalMediaDirs();
                path = (dirs.length > 0) ? dirs[0] : null;
                break;
            case "appData":
                path = new File(ctx.getApplicationInfo().dataDir);
                break;
            case "appFiles":
                path = ctx.getFilesDir();
                break;
            case "appCache":
                path = ctx.getCacheDir();
                break;
            default:
                call.reject("Unknown type: " + type);
                return;
        }

        if (path == null) {
            call.reject("Path not available");
            return;
        }

        JSObject ret = new JSObject();
        ret.put("path", path.getAbsolutePath());
        call.resolve(ret);
    }

    @PluginMethod
    public void getFileUri(PluginCall call) {
        String path = call.getString("path");
        if (path == null) {
            call.reject("path is required");
            return;
        }

        try {
            String authority = getContext().getPackageName() + ".filesystem.provider";
            Uri uri = FileProvider.getUriForFile(getContext(), authority, new File(path));
            JSObject ret = new JSObject();
            ret.put("uri", uri.toString());
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "getFileUri failed", e);
            call.reject("getFileUri failed: " + e.getMessage());
        }
    }

    @PluginMethod
    public void writeFile(PluginCall call) {
        String path = call.getString("path");
        String data = call.getString("data");
        String encoding = call.getString("encoding", "utf8");

        if (path == null || data == null) {
            call.reject("path and data are required");
            return;
        }

        try {
            File file = new File(path);
            File parent = file.getParentFile();
            if (parent != null && !parent.exists()) {
                parent.mkdirs();
            }

            byte[] bytes = "base64".equals(encoding)
                ? Base64.decode(data, Base64.DEFAULT)
                : data.getBytes(StandardCharsets.UTF_8);

            try (BufferedOutputStream bos = new BufferedOutputStream(new FileOutputStream(file))) {
                bos.write(bytes);
            }

            call.resolve();
        } catch (Exception e) {
            Log.e(TAG, "writeFile failed", e);
            call.reject("Write failed: " + e.getMessage());
        }
    }

    @PluginMethod
    public void readFile(PluginCall call) {
        String path = call.getString("path");
        String encoding = call.getString("encoding", "utf8");

        if (path == null) {
            call.reject("path is required");
            return;
        }

        File file = new File(path);
        if (!file.exists()) {
            call.reject("File not found: " + path);
            return;
        }

        try (BufferedInputStream bis = new BufferedInputStream(new FileInputStream(file));
             ByteArrayOutputStream baos = new ByteArrayOutputStream()) {

            byte[] buf = new byte[8192];
            int len;
            while ((len = bis.read(buf)) != -1) {
                baos.write(buf, 0, len);
            }

            String result = "base64".equals(encoding)
                ? Base64.encodeToString(baos.toByteArray(), Base64.NO_WRAP)
                : baos.toString("UTF-8");

            JSObject ret = new JSObject();
            ret.put("data", result);
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "readFile failed", e);
            call.reject("Read failed: " + e.getMessage());
        }
    }

    @PluginMethod
    public void remove(PluginCall call) {
        String path = call.getString("path");
        if (path == null) {
            call.reject("path is required");
            return;
        }

        if (deleteRecursively(new File(path))) {
            call.resolve();
        } else {
            call.reject("Delete failed");
        }
    }

    @PluginMethod
    public void mkdir(PluginCall call) {
        String path = call.getString("path");
        if (path == null) {
            call.reject("path is required");
            return;
        }

        File dir = new File(path);
        if (dir.exists() || dir.mkdirs()) {
            call.resolve();
        } else {
            call.reject("Failed to create directory");
        }
    }

    @PluginMethod
    public void exists(PluginCall call) {
        String path = call.getString("path");
        if (path == null) {
            call.reject("path is required");
            return;
        }

        JSObject ret = new JSObject();
        ret.put("exists", new File(path).exists());
        call.resolve(ret);
    }

    private boolean deleteRecursively(File file) {
        if (file.isDirectory()) {
            File[] children = file.listFiles();
            if (children != null) {
                for (File child : children) {
                    if (!deleteRecursively(child)) {
                        return false;
                    }
                }
            }
        }
        return file.delete();
    }
}
