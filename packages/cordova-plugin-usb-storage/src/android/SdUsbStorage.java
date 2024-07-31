/**
 * 참고코드: https://github.com/magnusja/libaums/blob/cc71b9654ac2ea0ee713f06b26d9eb01fa88b515/androidtests/src/androidTest/java/me/jahnen/libaums/core/androidtests/LibAumsTest.kt#L14
 */

package kr.co.simplysm.cordova;

import org.apache.cordova.CallbackContext;
import org.apache.cordova.CordovaPlugin;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import android.app.PendingIntent;
import android.content.Context;

import java.io.PrintWriter;
import java.io.StringWriter;
import java.util.Arrays;
import java.util.Optional;
import java.util.concurrent.TimeoutException;

import android.content.Intent;
import android.hardware.usb.UsbDevice;
import android.hardware.usb.UsbManager;

import me.jahnen.libaums.core.UsbMassStorageDevice;
import me.jahnen.libaums.core.fs.FileSystem;
import me.jahnen.libaums.core.fs.UsbFile;
import me.jahnen.libaums.core.fs.UsbFileInputStream;

public class SdUsbStorage extends CordovaPlugin {
  @Override
  public boolean execute(String action, JSONArray args, CallbackContext callbackContext) throws JSONException {
    try {
      if (action.equals("getDevices")) {
        Context context = cordova.getContext();
        UsbMassStorageDevice[] devices = UsbMassStorageDevice.getMassStorageDevices(context);

        JSONArray result = new JSONArray();
        for (UsbMassStorageDevice device : devices) {
          UsbDevice usbDevice = device.getUsbDevice();

          JSONObject resultObj = new JSONObject();
          resultObj.put("deviceName", usbDevice.getDeviceName());
          resultObj.put("manufacturerName", usbDevice.getManufacturerName());
          resultObj.put("productName", usbDevice.getProductName());
          resultObj.put("vendorId", usbDevice.getVendorId());
          resultObj.put("productId", usbDevice.getProductId());
          result.put(resultObj);
        }

        callbackContext.success(result);

        return true;
      }
      else if (action.equals("requestPermission")) {
        int vendorId = args.getInt(0);
        int productId = args.getInt(1);

        Context context = cordova.getContext();
        UsbMassStorageDevice device = this.getDevice(context, vendorId, productId);
        UsbDevice usbDevice = device.getUsbDevice();

        UsbManager usbManager = (UsbManager) context.getSystemService(Context.USB_SERVICE);
        if (!usbManager.hasPermission(usbDevice)) {
          PendingIntent permissionIntent = PendingIntent.getBroadcast(context, 0, new Intent("kr.co.simplysm.usb-storage.USB_PERMISSION"), 0);
          usbManager.requestPermission(usbDevice, permissionIntent);

          long startWaitPermissionTime = System.currentTimeMillis();
          while (!usbManager.hasPermission(usbDevice)
            && System.currentTimeMillis() < startWaitPermissionTime + (30 * 1000)) {
            Thread.sleep(500);
          }
          if (!usbManager.hasPermission(usbDevice)) {
            throw new TimeoutException("USB 장치에 대한 권한을 얻지 못했습니다.");
          }
        }

        callbackContext.success();
        return true;
      }
      else if (action.equals("readdir")) {
        int vendorId = args.getInt(0);
        int productId = args.getInt(1);
        String path = args.getString(2);

        Context context = cordova.getContext();
        UsbMassStorageDevice device = this.getDevice(context, vendorId, productId);

        UsbManager usbManager = (UsbManager) context.getSystemService(Context.USB_SERVICE);
        if (!usbManager.hasPermission(device.getUsbDevice())) {
          throw new Exception("USB 장치에 대한 접근 권한이 없습니다.");
        }

        device.init();
        FileSystem fs = device.getPartitions().get(0).getFileSystem();
        UsbFile root = fs.getRootDirectory();
        UsbFile dir = root.search(path);
        UsbFile[] files = dir.listFiles();

        JSONArray result = new JSONArray();
        for (UsbFile file : files) {
          result.put(file.getName());
        }

        callbackContext.success(result);
        return true;
      }
      else if (action.equals("read")) {
        int vendorId = args.getInt(0);
        int productId = args.getInt(1);
        String path = args.getString(2);

        Context context = cordova.getContext();
        UsbMassStorageDevice device = this.getDevice(context, vendorId, productId);

        UsbManager usbManager = (UsbManager) context.getSystemService(Context.USB_SERVICE);
        if (!usbManager.hasPermission(device.getUsbDevice())) {
          throw new Exception("USB 장치에 대한 접근 권한이 없습니다.");
        }

        device.init();
        FileSystem fs = device.getPartitions().get(0).getFileSystem();
        UsbFile root = fs.getRootDirectory();
        UsbFile usbFile = root.search(path);
        if (usbFile == null) {
          throw new Exception("경로를 찾을 수 없습니다.");
        }

        UsbFileInputStream inputStream = new UsbFileInputStream(usbFile);
        byte[] buf = new byte[(int) usbFile.getLength()];
        inputStream.read(buf);

        callbackContext.success(buf);
        return true;
      }
    }
    catch (Exception e) {
      callbackContext.error(getStack(e));
    }
    return false;
  }

  private String getStack(Exception exception) {
    StringWriter sw = new StringWriter();
    exception.printStackTrace(new PrintWriter(sw));
    return sw.toString().replace("\t", "  ");
  }

  private UsbMassStorageDevice getDevice(Context context, int vendorId, int productId) throws Exception {
    UsbMassStorageDevice[] devices = UsbMassStorageDevice.getMassStorageDevices(context);
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