package kr.co.simplysm.capacitor.apkinstaller;

import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "ApkInstaller")
public class ApkInstallerPlugin extends Plugin {

    private static final String TAG = "ApkInstallerPlugin";

    @PluginMethod
    public void install(PluginCall call) {
        String uriStr = call.getString("uri");
        if (uriStr == null) {
            call.reject("uri is required");
            return;
        }

        try {
            Uri apkUri = Uri.parse(uriStr);

            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.setDataAndType(apkUri, "application/vnd.android.package-archive");
            intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_GRANT_READ_URI_PERMISSION);

            getContext().startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            Log.e(TAG, "install failed", e);
            call.reject("Install failed: " + e.getMessage());
        }
    }

    @PluginMethod
    public void hasPermission(PluginCall call) {
        boolean granted;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            granted = getContext().getPackageManager().canRequestPackageInstalls();
        } else {
            granted = true;
        }

        JSObject ret = new JSObject();
        ret.put("granted", granted);
        call.resolve(ret);
    }

    @PluginMethod
    public void requestPermission(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Context context = getContext();
            Intent intent = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES);
            intent.setData(Uri.parse("package:" + context.getPackageName()));
            intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(intent);
        }
        call.resolve();
    }

    @PluginMethod
    public void hasPermissionManifest(PluginCall call) {
        try {
            Context context = getContext();
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

            JSObject ret = new JSObject();
            ret.put("declared", declared);
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "hasPermissionManifest failed", e);
            call.reject("Manifest check failed: " + e.getMessage());
        }
    }

    @PluginMethod
    public void getVersionInfo(PluginCall call) {
        try {
            Context context = getContext();
            PackageManager pm = context.getPackageManager();
            PackageInfo info = pm.getPackageInfo(context.getPackageName(), 0);

            String versionName = info.versionName;
            long versionCode;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                versionCode = info.getLongVersionCode();
            } else {
                versionCode = info.versionCode;
            }

            JSObject ret = new JSObject();
            ret.put("versionName", versionName);
            ret.put("versionCode", String.valueOf(versionCode));
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "getVersionInfo failed", e);
            call.reject("getVersionInfo failed: " + e.getMessage());
        }
    }
}
