package kr.co.simplysm.capacitor.filesystem

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.Settings
import android.util.Base64
import android.util.Log
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import java.io.BufferedInputStream
import java.io.BufferedOutputStream
import java.io.ByteArrayOutputStream
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import java.nio.charset.StandardCharsets

@CapacitorPlugin(name = "FileSystem")
class FileSystemPlugin : Plugin() {

    companion object {
        private const val TAG = "FileSystemPlugin"
        private const val PERMISSION_REQUEST_CODE = 1001
    }

    @PluginMethod
    override fun checkPermissions(call: PluginCall) {
        val granted = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            Environment.isExternalStorageManager()
        } else {
            val ctx = context
            ContextCompat.checkSelfPermission(ctx, Manifest.permission.READ_EXTERNAL_STORAGE) == PackageManager.PERMISSION_GRANTED
                    && ContextCompat.checkSelfPermission(ctx, Manifest.permission.WRITE_EXTERNAL_STORAGE) == PackageManager.PERMISSION_GRANTED
        }
        val ret = JSObject()
        ret.put("granted", granted)
        call.resolve(ret)
    }

    @PluginMethod
    override fun requestPermissions(call: PluginCall) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            if (!Environment.isExternalStorageManager()) {
                val intent = Intent(Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION)
                intent.data = Uri.parse("package:" + context.packageName)
                activity.startActivity(intent)
            }
        } else {
            val readGranted = ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.READ_EXTERNAL_STORAGE
            ) == PackageManager.PERMISSION_GRANTED
            val writeGranted = ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.WRITE_EXTERNAL_STORAGE
            ) == PackageManager.PERMISSION_GRANTED

            if (!readGranted || !writeGranted) {
                ActivityCompat.requestPermissions(
                    activity,
                    arrayOf(
                        Manifest.permission.READ_EXTERNAL_STORAGE,
                        Manifest.permission.WRITE_EXTERNAL_STORAGE
                    ),
                    PERMISSION_REQUEST_CODE
                )
            }
        }
        call.resolve()
    }

    @PluginMethod
    fun readdir(call: PluginCall) {
        val path = call.getString("path")
        if (path == null) {
            call.reject("path is required")
            return
        }

        val dir = File(path)
        if (!dir.exists() || !dir.isDirectory) {
            call.reject("Directory does not exist")
            return
        }

        val files = dir.listFiles()
        if (files == null) {
            call.reject("Cannot read directory")
            return
        }

        val result = JSArray()
        for (f in files) {
            val info = JSObject()
            info.put("name", f.name)
            info.put("isDirectory", f.isDirectory)
            result.put(info)
        }

        val ret = JSObject()
        ret.put("files", result)
        call.resolve(ret)
    }

    @PluginMethod
    fun getStoragePath(call: PluginCall) {
        val type = call.getString("type")
        if (type == null) {
            call.reject("type is required")
            return
        }

        val ctx = context
        val path: File? = when (type) {
            "external" -> Environment.getExternalStorageDirectory()
            "externalFiles" -> ctx.getExternalFilesDir(null)
            "externalCache" -> ctx.externalCacheDir
            "externalMedia" -> {
                val dirs = ctx.externalMediaDirs
                if (dirs.isNotEmpty()) dirs[0] else null
            }
            "appData" -> File(ctx.applicationInfo.dataDir)
            "appFiles" -> ctx.filesDir
            "appCache" -> ctx.cacheDir
            else -> {
                call.reject("Unknown type: $type")
                return
            }
        }

        if (path == null) {
            call.reject("Path not available")
            return
        }

        val ret = JSObject()
        ret.put("path", path.absolutePath)
        call.resolve(ret)
    }

    @PluginMethod
    fun getUri(call: PluginCall) {
        val path = call.getString("path")
        if (path == null) {
            call.reject("path is required")
            return
        }

        try {
            val authority = context.packageName + ".filesystem.provider"
            val uri = FileProvider.getUriForFile(context, authority, File(path))
            val ret = JSObject()
            ret.put("uri", uri.toString())
            call.resolve(ret)
        } catch (e: Exception) {
            Log.e(TAG, "getUri failed", e)
            call.reject("getUri failed: " + e.message)
        }
    }

    @PluginMethod
    fun writeFile(call: PluginCall) {
        val path = call.getString("path")
        val data = call.getString("data")
        val encoding = call.getString("encoding", "utf8")

        if (path == null || data == null) {
            call.reject("path and data are required")
            return
        }

        try {
            val file = File(path)
            val parent = file.parentFile
            if (parent != null && !parent.exists()) {
                parent.mkdirs()
            }

            val bytes = if ("base64" == encoding) {
                Base64.decode(data, Base64.DEFAULT)
            } else {
                data.toByteArray(StandardCharsets.UTF_8)
            }

            BufferedOutputStream(FileOutputStream(file)).use { bos ->
                bos.write(bytes)
            }

            call.resolve()
        } catch (e: Exception) {
            Log.e(TAG, "writeFile failed", e)
            call.reject("Write failed: " + e.message)
        }
    }

    @PluginMethod
    fun readFile(call: PluginCall) {
        val path = call.getString("path")
        val encoding = call.getString("encoding", "utf8")

        if (path == null) {
            call.reject("path is required")
            return
        }

        val file = File(path)
        if (!file.exists()) {
            call.reject("File not found: $path")
            return
        }

        try {
            BufferedInputStream(FileInputStream(file)).use { bis ->
                ByteArrayOutputStream().use { baos ->
                    val buf = ByteArray(8192)
                    var len: Int
                    while (bis.read(buf).also { len = it } != -1) {
                        baos.write(buf, 0, len)
                    }

                    val result = if ("base64" == encoding) {
                        Base64.encodeToString(baos.toByteArray(), Base64.NO_WRAP)
                    } else {
                        baos.toString("UTF-8")
                    }

                    val ret = JSObject()
                    ret.put("data", result)
                    call.resolve(ret)
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "readFile failed", e)
            call.reject("Read failed: " + e.message)
        }
    }

    @PluginMethod
    fun remove(call: PluginCall) {
        val path = call.getString("path")
        if (path == null) {
            call.reject("path is required")
            return
        }

        if (deleteRecursively(File(path))) {
            call.resolve()
        } else {
            call.reject("Delete failed")
        }
    }

    @PluginMethod
    fun mkdir(call: PluginCall) {
        val path = call.getString("path")
        if (path == null) {
            call.reject("path is required")
            return
        }

        val dir = File(path)
        if (dir.exists() || dir.mkdirs()) {
            call.resolve()
        } else {
            call.reject("Failed to create directory")
        }
    }

    @PluginMethod
    fun exists(call: PluginCall) {
        val path = call.getString("path")
        if (path == null) {
            call.reject("path is required")
            return
        }

        val ret = JSObject()
        ret.put("exists", File(path).exists())
        call.resolve(ret)
    }

    private fun deleteRecursively(file: File): Boolean {
        if (file.isDirectory) {
            val children = file.listFiles()
            if (children != null) {
                for (child in children) {
                    if (!deleteRecursively(child)) {
                        return false
                    }
                }
            }
        }
        return file.delete()
    }
}
