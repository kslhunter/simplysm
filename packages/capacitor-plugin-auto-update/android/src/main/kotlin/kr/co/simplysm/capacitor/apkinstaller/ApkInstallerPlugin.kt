package kr.co.simplysm.capacitor.apkinstaller

import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.provider.Settings
import android.util.Log

import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

@CapacitorPlugin(name = "ApkInstaller")
class ApkInstallerPlugin : Plugin() {

    companion object {
        private const val TAG = "ApkInstallerPlugin"
    }

    @PluginMethod
    fun install(call: PluginCall) {
        val uriStr = call.getString("uri")
        if (uriStr == null) {
            call.reject("uri is required")
            return
        }

        try {
            val apkUri = Uri.parse(uriStr)

            val intent = Intent(Intent.ACTION_VIEW)
            intent.setDataAndType(apkUri, "application/vnd.android.package-archive")
            intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_GRANT_READ_URI_PERMISSION

            context.startActivity(intent)
            call.resolve()
        } catch (e: Exception) {
            Log.e(TAG, "install failed", e)
            call.reject("Install failed: " + e.message)
        }
    }

    @PluginMethod
    override fun checkPermissions(call: PluginCall) {
        // Check granted
        val granted = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.packageManager.canRequestPackageInstalls()
        } else {
            true
        }

        // Check manifest
        var manifest = false
        try {
            val targetPermission = "android.permission.REQUEST_INSTALL_PACKAGES"
            val requestedPermissions = context.packageManager
                .getPackageInfo(context.packageName, PackageManager.GET_PERMISSIONS)
                .requestedPermissions
            if (requestedPermissions != null) {
                for (perm in requestedPermissions) {
                    if (targetPermission == perm) {
                        manifest = true
                        break
                    }
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "checkPermissions manifest check failed", e)
        }

        val ret = JSObject()
        ret.put("granted", granted)
        ret.put("manifest", manifest)
        call.resolve(ret)
    }

    @PluginMethod
    override fun requestPermissions(call: PluginCall) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val intent = Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES)
            intent.data = Uri.parse("package:" + context.packageName)
            intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
            context.startActivity(intent)
        }
        call.resolve()
    }

    @PluginMethod
    fun getVersionInfo(call: PluginCall) {
        try {
            val pm = context.packageManager
            val info = pm.getPackageInfo(context.packageName, 0)

            val versionName = info.versionName
            val versionCode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                info.longVersionCode
            } else {
                @Suppress("DEPRECATION")
                info.versionCode.toLong()
            }

            val ret = JSObject()
            ret.put("versionName", versionName)
            ret.put("versionCode", versionCode.toString())
            call.resolve(ret)
        } catch (e: Exception) {
            Log.e(TAG, "getVersionInfo failed", e)
            call.reject("getVersionInfo failed: " + e.message)
        }
    }
}
