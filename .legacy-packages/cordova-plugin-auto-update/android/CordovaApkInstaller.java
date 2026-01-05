package kr.co.simplysm.cordova.apkinstaller;

import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import org.apache.cordova.CallbackContext;
import org.apache.cordova.CordovaPlugin;
import org.apache.cordova.LOG;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

public class CordovaApkInstaller extends CordovaPlugin {

    @Override
    public boolean execute(String action, JSONArray args, CallbackContext callbackContext) {
        try {
            LOG.d("CordovaApkInstaller", "Executing action: " + action);

            switch (action) {
                case "install":
                    handleInstall(args, callbackContext);
                    return true;
                case "hasPermission":
                    handleHasPermission(callbackContext);
                    return true;
                case "requestPermission":
                    handleRequestPermission(callbackContext);
                    return true;
                case "hasPermissionManifest":
                    handleHasPermissionManifest(callbackContext);
                    return true;
                case "getVersionInfo":
                    handleGetVersionInfo(callbackContext);
                    return true;
                default:
                    callbackContext.error("Unknown action: " + action);
                    return false;
            }
        } catch (Exception e) {
            LOG.e("CordovaApkInstaller", "Error occurred while executing action: " + action, e);
            callbackContext.error("Error: " + e.getClass().getSimpleName() + " - " + e.getMessage());
            return false;
        }
    }

    // ---- Action Handlers ----

    private void handleInstall(JSONArray args, CallbackContext callbackContext) throws JSONException {
        final Context context = this.cordova.getContext();
        final String apkUriStr = args.getString(0);

        cordova.getThreadPool().execute(() -> {
            try {
                Uri apkUri = Uri.parse(apkUriStr);

                Intent intent = new Intent(Intent.ACTION_VIEW);
                intent.setDataAndType(apkUri, "application/vnd.android.package-archive");
                intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_GRANT_READ_URI_PERMISSION);

                context.startActivity(intent);
                callbackContext.success();
            } catch (Exception e) {
                LOG.e("CordovaApkInstaller", "install failed", e);
                callbackContext.error("Install failed: " + e.getClass().getSimpleName() + " - " + e.getMessage());
            }
        });
    }

    private void handleHasPermission(CallbackContext callbackContext) {
        cordova.getThreadPool().execute(() -> {
            Context context = this.cordova.getContext();
            boolean allowed = Build.VERSION.SDK_INT < Build.VERSION_CODES.O || context.getPackageManager().canRequestPackageInstalls();
            callbackContext.success(allowed ? "true" : "false");
        });
    }

    private void handleRequestPermission(CallbackContext callbackContext) {
        cordova.getThreadPool().execute(() -> {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                Context context = this.cordova.getContext();
                Intent intent = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES);
                intent.setData(Uri.parse("package:" + context.getPackageName()));
                intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(intent);
            }

            callbackContext.success();
        });
    }

    private void handleHasPermissionManifest(CallbackContext callbackContext){
        cordova.getThreadPool().execute(() -> {
            try {
                Context context = this.cordova.getContext();
                String targetPermission = "android.permission.REQUEST_INSTALL_PACKAGES";

                String[] requestedPermissions = context.getPackageManager()
                    .getPackageInfo(context.getPackageName(), PackageManager.GET_PERMISSIONS)
                    .requestedPermissions;

                boolean declared = false;
                if (requestedPermissions != null) {
                    for (String perm : requestedPermissions) {
                        if (targetPermission.equals(perm)) {
                            declared = true;
                            break;
                        }
                    }
                }

                callbackContext.success(declared ? "true" : "false");
            } catch (Exception e) {
                LOG.e("CordovaApkInstaller", "Manifest permission check failed", e);
                callbackContext.error("Manifest check failed: " + e.getClass().getSimpleName() + " - " + e.getMessage());
            }
        });
    }

    private void handleGetVersionInfo(CallbackContext callbackContext) {
        cordova.getThreadPool().execute(() -> {
            try {
                Context context = this.cordova.getContext();
                PackageManager pm = context.getPackageManager();
                PackageInfo info = pm.getPackageInfo(context.getPackageName(), 0);

                String versionName = info.versionName;
                long versionCode = (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P)
                    ? info.getLongVersionCode()
                    : info.versionCode;

                JSONObject result = new JSONObject();
                result.put("versionName", versionName);
                result.put("versionCode", versionCode);

                callbackContext.success(result);
            } catch (Exception e) {
                LOG.e("CordovaApkInstaller", "getVersionInfo failed", e);
                callbackContext.error("getVersionInfo failed: " + e.getClass().getSimpleName() + " - " + e.getMessage());
            }
        });
    }
}
