package kr.co.simplysm.cordova;

import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageInstaller;
import android.os.Build;
import android.provider.Settings;

import org.apache.cordova.CallbackContext;
import org.apache.cordova.CordovaPlugin;
import org.apache.cordova.LOG;

import org.json.JSONArray;
import org.json.JSONException;

import java.io.File;
import java.io.FileInputStream;
import java.io.OutputStream;

public class ApkInstaller extends CordovaPlugin {

    @Override
    public boolean execute(String action, JSONArray args, CallbackContext callbackContext) throws JSONException {
        if ("installApk".equals(action)) {
            String apkPath = args.getString(0);
            cordova.getThreadPool().execute(() -> installApk(apkPath, callbackContext));
            return true;
        } else if ("canRequestPackageInstalls".equals(action)) {
            boolean allowed = Build.VERSION.SDK_INT < 26 || cordova.getContext()
                .getPackageManager().canRequestPackageInstalls();
            callbackContext.success(allowed ? "true" : "false");
            return true;
        } else if ("openUnknownAppSourcesSettings".equals(action)) {
            openUnknownSourcesSettings();
            callbackContext.success();
            return true;
        }

        return false;
    }

    private void installApk(String apkPath, CallbackContext callbackContext) {
        try {
            Context context = cordova.getContext();
            File apkFile = new File(apkPath);
            if (!apkFile.exists()) {
                callbackContext.error("APK file not found: " + apkFile.getAbsolutePath());
                return;
            }

            PackageInstaller packageInstaller = context.getPackageManager().getPackageInstaller();
            PackageInstaller.SessionParams params = new PackageInstaller.SessionParams(
                PackageInstaller.SessionParams.MODE_FULL_INSTALL);
            int sessionId = packageInstaller.createSession(params);
            PackageInstaller.Session session = packageInstaller.openSession(sessionId);

            try (OutputStream out = session.openWrite("apk", 0, -1);
                 FileInputStream in = new FileInputStream(apkFile)) {
                byte[] buffer = new byte[65536];
                int len;
                while ((len = in.read(buffer)) != -1) {
                    out.write(buffer, 0, len);
                }
                session.fsync(out);
            }

            Intent emptyIntent = new Intent();
            PendingIntent pi = PendingIntent.getActivity(
                context, 0, emptyIntent, PendingIntent.FLAG_IMMUTABLE
            );
            session.commit(pi.getIntentSender());

            session.close(); // 리소스 정리

            callbackContext.success("Installation started");
        } catch (Exception e) {
            LOG.e("ApkInstaller", "Install failed", e);
            callbackContext.error("Install failed: " + e.getMessage());
        }
    }

    private void openUnknownSourcesSettings() {
        if (Build.VERSION.SDK_INT >= 26) {
            Intent intent = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES);
            intent.setData(android.net.Uri.parse("package:" + cordova.getContext().getPackageName()));
            intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            cordova.getActivity().startActivity(intent);
        }
    }
}
