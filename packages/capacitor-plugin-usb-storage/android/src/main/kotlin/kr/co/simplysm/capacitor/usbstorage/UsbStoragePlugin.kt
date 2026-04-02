package kr.co.simplysm.capacitor.usbstorage

import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.hardware.usb.UsbManager
import android.os.Build
import android.util.Base64
import android.util.Log
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import me.jahnen.libaums.core.UsbMassStorageDevice
import me.jahnen.libaums.core.fs.UsbFileInputStream
import java.nio.ByteBuffer

@CapacitorPlugin(name = "UsbStorage")
class UsbStoragePlugin : Plugin() {

    companion object {
        private const val TAG = "UsbStoragePlugin"
        private const val ACTION_USB_PERMISSION = "kr.co.simplysm.capacitor.usbstorage.USB_PERMISSION"
        private const val MAX_FILE_SIZE = 100L * 1024 * 1024 // 100MB
    }

    @PluginMethod
    fun getDevices(call: PluginCall) {
        try {
            val devices = UsbMassStorageDevice.getMassStorageDevices(context)

            val result = JSArray()
            for (device in devices) {
                val usbDevice = device.usbDevice

                val deviceObj = JSObject()
                deviceObj.put("deviceName", usbDevice.deviceName)
                deviceObj.put("manufacturerName", usbDevice.manufacturerName)
                deviceObj.put("productName", usbDevice.productName)
                deviceObj.put("vendorId", usbDevice.vendorId)
                deviceObj.put("productId", usbDevice.productId)
                result.put(deviceObj)
            }

            val ret = JSObject()
            ret.put("devices", result)
            call.resolve(ret)
        } catch (e: Exception) {
            Log.e(TAG, "getDevices failed", e)
            call.reject("getDevices failed: ${e.message}")
        }
    }

    @PluginMethod
    fun requestPermissions(call: PluginCall) {
        val vendorId = call.getInt("vendorId")
        val productId = call.getInt("productId")

        if (vendorId == null || productId == null) {
            call.reject("vendorId and productId are required")
            return
        }

        try {
            val device = getDevice(vendorId, productId)
            val usbDevice = device.usbDevice

            val usbManager = context.getSystemService(Context.USB_SERVICE) as UsbManager
            if (usbManager.hasPermission(usbDevice)) {
                val ret = JSObject()
                ret.put("granted", true)
                call.resolve(ret)
                return
            }

            val receiver = object : BroadcastReceiver() {
                override fun onReceive(context: Context, intent: Intent) {
                    try {
                        context.unregisterReceiver(this)
                        val granted = intent.getBooleanExtra(UsbManager.EXTRA_PERMISSION_GRANTED, false)
                        val ret = JSObject()
                        ret.put("granted", granted)
                        call.resolve(ret)
                    } catch (e: Exception) {
                        Log.e(TAG, "requestPermission callback failed", e)
                        call.reject("requestPermission failed: ${e.message}")
                    }
                }
            }

            val filter = IntentFilter(ACTION_USB_PERMISSION)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                context.registerReceiver(receiver, filter, Context.RECEIVER_NOT_EXPORTED)
            } else {
                context.registerReceiver(receiver, filter)
            }

            val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                PendingIntent.FLAG_MUTABLE
            } else {
                0
            }
            val permissionIntent = PendingIntent.getBroadcast(
                context, 0, Intent(ACTION_USB_PERMISSION), flags
            )
            usbManager.requestPermission(usbDevice, permissionIntent)
        } catch (e: Exception) {
            Log.e(TAG, "requestPermission failed", e)
            call.reject("requestPermission failed: ${e.message}")
        }
    }

    @PluginMethod
    fun checkPermissions(call: PluginCall) {
        val vendorId = call.getInt("vendorId")
        val productId = call.getInt("productId")

        if (vendorId == null || productId == null) {
            call.reject("vendorId and productId are required")
            return
        }

        try {
            val device = getDevice(vendorId, productId)
            val usbManager = context.getSystemService(Context.USB_SERVICE) as UsbManager
            val hasPermission = usbManager.hasPermission(device.usbDevice)

            val ret = JSObject()
            ret.put("granted", hasPermission)
            call.resolve(ret)
        } catch (e: Exception) {
            Log.e(TAG, "hasPermission failed", e)
            call.reject("hasPermission failed: ${e.message}")
        }
    }

    @PluginMethod
    fun readdir(call: PluginCall) {
        val vendorId = call.getInt("vendorId")
        val productId = call.getInt("productId")
        val path = call.getString("path")

        if (vendorId == null || productId == null || path == null) {
            call.reject("vendorId, productId, and path are required")
            return
        }

        try {
            val device = getDevice(vendorId, productId)

            val usbManager = context.getSystemService(Context.USB_SERVICE) as UsbManager
            if (!usbManager.hasPermission(device.usbDevice)) {
                call.reject("No permission for this USB device")
                return
            }

            device.init()
            try {
                val fs = device.partitions[0].fileSystem
                val root = fs.rootDirectory
                val dir = root.search(path)

                if (dir == null || !dir.isDirectory) {
                    call.reject("Directory not found: $path")
                    return
                }

                val files = dir.listFiles()

                val result = JSArray()
                for (file in files) {
                    val info = JSObject()
                    info.put("name", file.name)
                    info.put("isDirectory", file.isDirectory)
                    result.put(info)
                }

                val ret = JSObject()
                ret.put("files", result)
                call.resolve(ret)
            } finally {
                device.close()
            }
        } catch (e: Exception) {
            Log.e(TAG, "readdir failed", e)
            call.reject("readdir failed: ${e.message}")
        }
    }

    @PluginMethod
    fun readFile(call: PluginCall) {
        val vendorId = call.getInt("vendorId")
        val productId = call.getInt("productId")
        val path = call.getString("path")

        if (vendorId == null || productId == null || path == null) {
            call.reject("vendorId, productId, and path are required")
            return
        }

        try {
            val device = getDevice(vendorId, productId)

            val usbManager = context.getSystemService(Context.USB_SERVICE) as UsbManager
            if (!usbManager.hasPermission(device.usbDevice)) {
                call.reject("No permission for this USB device")
                return
            }

            device.init()
            try {
                val fs = device.partitions[0].fileSystem
                val root = fs.rootDirectory
                val usbFile = root.search(path)

                if (usbFile == null) {
                    val ret = JSObject()
                    ret.put("data", null as String?)
                    call.resolve(ret)
                    return
                }

                if (usbFile.isDirectory) {
                    call.reject("Path is a directory: $path")
                    return
                }

                val fileLength = usbFile.length
                if (fileLength > MAX_FILE_SIZE) {
                    call.reject("File too large: $fileLength bytes (max $MAX_FILE_SIZE)")
                    return
                }
                val buffer = ByteBuffer.allocate(fileLength.toInt())

                val inputStream = UsbFileInputStream(usbFile)
                val tmpBuf = ByteArray(fs.chunkSize)
                var count: Int
                while (inputStream.read(tmpBuf).also { count = it } != -1) {
                    buffer.put(tmpBuf, 0, count)
                }
                inputStream.close()

                val base64Data = Base64.encodeToString(buffer.array(), Base64.NO_WRAP)

                val ret = JSObject()
                ret.put("data", base64Data)
                call.resolve(ret)
            } finally {
                device.close()
            }
        } catch (e: Exception) {
            Log.e(TAG, "readFile failed", e)
            call.reject("readFile failed: ${e.message}")
        }
    }

    @Throws(Exception::class)
    private fun getDevice(vendorId: Int, productId: Int): UsbMassStorageDevice {
        val devices = UsbMassStorageDevice.getMassStorageDevices(context)
        return devices.firstOrNull { device ->
            val usbDevice = device.usbDevice
            usbDevice.vendorId == vendorId && usbDevice.productId == productId
        } ?: throw Exception("USB device not found: vendorId=$vendorId, productId=$productId")
    }
}
