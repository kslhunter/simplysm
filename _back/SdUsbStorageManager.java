package kr.co.simplysm.cordova;

import android.content.Context;
import android.hardware.usb.UsbConstants;
import android.hardware.usb.UsbDevice;
import android.hardware.usb.UsbInterface;
import android.hardware.usb.UsbManager;

import java.util.HashMap;

public class SdUsbStorageManager {
  public static SdUsbDevice[] getUsbDevices(Context context) {
    UsbManager usbManager = (UsbManager) context.getSystemService(Context.USB_SERVICE);
    HashMap<String, UsbDevice> devices = usbManager.getDeviceList();
    devices.entrySet().stream().map((item) -> {
      UsbDevice device = item.getValue();
      for (int i = 0; i < device.getInterfaceCount(); i++) {
        UsbInterface currInterface = device.getInterface(i);
        if (currInterface.getInterfaceClass() == UsbConstants.USB_CLASS_MASS_STORAGE
          && currInterface.getInterfaceSubclass() == 6
          && currInterface.getInterfaceProtocol() == 80) {

          for (int j = 0; j < currInterface.getEndpointCount(); j++) {

          }
        }
      }

      return device;
    });
  }
}
