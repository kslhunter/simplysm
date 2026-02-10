package kr.co.simplysm.capacitor.usbstorage;

import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.hardware.usb.UsbDevice;
import android.hardware.usb.UsbManager;
import android.os.Build;
import android.util.Base64;
import android.util.Log;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.nio.ByteBuffer;
import java.util.Arrays;
import java.util.Optional;

import me.jahnen.libaums.core.UsbMassStorageDevice;
import me.jahnen.libaums.core.fs.FileSystem;
import me.jahnen.libaums.core.fs.UsbFile;
import me.jahnen.libaums.core.fs.UsbFileInputStream;

@CapacitorPlugin(name = "UsbStorage")
public class UsbStoragePlugin extends Plugin {

    private static final String TAG = "UsbStoragePlugin";
    private static final String ACTION_USB_PERMISSION = "kr.co.simplysm.capacitor.usbstorage.USB_PERMISSION";

    @PluginMethod
    public void getDevices(PluginCall call) {
        try {
            UsbMassStorageDevice[] devices = UsbMassStorageDevice.getMassStorageDevices(getContext());

            JSArray result = new JSArray();
            for (UsbMassStorageDevice device : devices) {
                UsbDevice usbDevice = device.getUsbDevice();

                JSObject deviceObj = new JSObject();
                deviceObj.put("deviceName", usbDevice.getDeviceName());
                deviceObj.put("manufacturerName", usbDevice.getManufacturerName());
                deviceObj.put("productName", usbDevice.getProductName());
                deviceObj.put("vendorId", usbDevice.getVendorId());
                deviceObj.put("productId", usbDevice.getProductId());
                result.put(deviceObj);
            }

            JSObject ret = new JSObject();
            ret.put("devices", result);
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "getDevices failed", e);
            call.reject("getDevices failed: " + e.getMessage());
        }
    }

    @PluginMethod
    public void requestPermission(PluginCall call) {
        Integer vendorId = call.getInt("vendorId");
        Integer productId = call.getInt("productId");

        if (vendorId == null || productId == null) {
            call.reject("vendorId and productId are required");
            return;
        }

        try {
            UsbMassStorageDevice device = getDevice(vendorId, productId);
            UsbDevice usbDevice = device.getUsbDevice();

            UsbManager usbManager = (UsbManager) getContext().getSystemService(Context.USB_SERVICE);
            if (usbManager.hasPermission(usbDevice)) {
                JSObject ret = new JSObject();
                ret.put("granted", true);
                call.resolve(ret);
                return;
            }

            BroadcastReceiver receiver = new BroadcastReceiver() {
                @Override
                public void onReceive(Context context, Intent intent) {
                    try {
                        context.unregisterReceiver(this);
                        boolean granted = intent.getBooleanExtra(UsbManager.EXTRA_PERMISSION_GRANTED, false);
                        JSObject ret = new JSObject();
                        ret.put("granted", granted);
                        call.resolve(ret);
                    } catch (Exception e) {
                        Log.e(TAG, "requestPermission callback failed", e);
                        call.reject("requestPermission failed: " + e.getMessage());
                    }
                }
            };

            IntentFilter filter = new IntentFilter(ACTION_USB_PERMISSION);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                getContext().registerReceiver(receiver, filter, Context.RECEIVER_NOT_EXPORTED);
            } else {
                getContext().registerReceiver(receiver, filter);
            }

            int flags = Build.VERSION.SDK_INT >= Build.VERSION_CODES.S
                ? PendingIntent.FLAG_MUTABLE
                : 0;
            PendingIntent permissionIntent = PendingIntent.getBroadcast(
                getContext(), 0, new Intent(ACTION_USB_PERMISSION), flags
            );
            usbManager.requestPermission(usbDevice, permissionIntent);
        } catch (Exception e) {
            Log.e(TAG, "requestPermission failed", e);
            call.reject("requestPermission failed: " + e.getMessage());
        }
    }

    @PluginMethod
    public void hasPermission(PluginCall call) {
        Integer vendorId = call.getInt("vendorId");
        Integer productId = call.getInt("productId");

        if (vendorId == null || productId == null) {
            call.reject("vendorId and productId are required");
            return;
        }

        try {
            UsbMassStorageDevice device = getDevice(vendorId, productId);
            UsbManager usbManager = (UsbManager) getContext().getSystemService(Context.USB_SERVICE);
            boolean hasPermission = usbManager.hasPermission(device.getUsbDevice());

            JSObject ret = new JSObject();
            ret.put("granted", hasPermission);
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "hasPermission failed", e);
            call.reject("hasPermission failed: " + e.getMessage());
        }
    }

    @PluginMethod
    public void readdir(PluginCall call) {
        Integer vendorId = call.getInt("vendorId");
        Integer productId = call.getInt("productId");
        String path = call.getString("path");

        if (vendorId == null || productId == null || path == null) {
            call.reject("vendorId, productId, and path are required");
            return;
        }

        try {
            UsbMassStorageDevice device = getDevice(vendorId, productId);

            UsbManager usbManager = (UsbManager) getContext().getSystemService(Context.USB_SERVICE);
            if (!usbManager.hasPermission(device.getUsbDevice())) {
                call.reject("USB 장치에 대한 접근 권한이 없습니다.");
                return;
            }

            device.init();

            FileSystem fs = device.getPartitions().get(0).getFileSystem();
            UsbFile root = fs.getRootDirectory();
            UsbFile dir = root.search(path);

            if (dir == null || !dir.isDirectory()) {
                call.reject("Directory not found: " + path);
                return;
            }

            UsbFile[] files = dir.listFiles();

            JSArray result = new JSArray();
            for (UsbFile file : files) {
                result.put(file.getName());
            }

            JSObject ret = new JSObject();
            ret.put("files", result);
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "readdir failed", e);
            call.reject("readdir failed: " + e.getMessage());
        }
    }

    @PluginMethod
    public void read(PluginCall call) {
        Integer vendorId = call.getInt("vendorId");
        Integer productId = call.getInt("productId");
        String path = call.getString("path");

        if (vendorId == null || productId == null || path == null) {
            call.reject("vendorId, productId, and path are required");
            return;
        }

        try {
            UsbMassStorageDevice device = getDevice(vendorId, productId);

            UsbManager usbManager = (UsbManager) getContext().getSystemService(Context.USB_SERVICE);
            if (!usbManager.hasPermission(device.getUsbDevice())) {
                call.reject("USB 장치에 대한 접근 권한이 없습니다.");
                return;
            }

            device.init();

            FileSystem fs = device.getPartitions().get(0).getFileSystem();
            UsbFile root = fs.getRootDirectory();
            UsbFile usbFile = root.search(path);

            if (usbFile == null) {
                JSObject ret = new JSObject();
                ret.put("data", (String) null);
                call.resolve(ret);
                return;
            }

            if (usbFile.isDirectory()) {
                call.reject("해당 경로는 폴더입니다.");
                return;
            }

            ByteBuffer buffer = ByteBuffer.allocate((int) usbFile.getLength());

            UsbFileInputStream inputStream = new UsbFileInputStream(usbFile);
            byte[] tmpBuf = new byte[fs.getChunkSize()];
            int count;
            while ((count = inputStream.read(tmpBuf)) != -1) {
                buffer.put(tmpBuf, 0, count);
            }
            inputStream.close();

            String base64Data = Base64.encodeToString(buffer.array(), Base64.NO_WRAP);

            JSObject ret = new JSObject();
            ret.put("data", base64Data);
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "read failed", e);
            call.reject("read failed: " + e.getMessage());
        }
    }

    private UsbMassStorageDevice getDevice(int vendorId, int productId) throws Exception {
        UsbMassStorageDevice[] devices = UsbMassStorageDevice.getMassStorageDevices(getContext());
        Optional<UsbMassStorageDevice> optDevice = Arrays.stream(devices).filter((tmpDevice) -> {
            UsbDevice tmpUsbDevice = tmpDevice.getUsbDevice();
            return tmpUsbDevice.getVendorId() == vendorId && tmpUsbDevice.getProductId() == productId;
        }).findFirst();

        if (!optDevice.isPresent()) {
            throw new Exception("USB 장치를 찾을 수 없습니다.");
        }
        return optDevice.get();
    }
}
