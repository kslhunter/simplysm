package kr.co.simplysm.capacitor.printer

import android.util.Log
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import device.sdk.print.Printer
import device.sdk.print.ReceiptPrint
import java.util.concurrent.Executors

@CapacitorPlugin(name = "Printer")
class PrinterPlugin : Plugin() {

    companion object {
        private const val TAG = "PrinterPlugin"
    }

    private val executor = Executors.newSingleThreadExecutor()

    @PluginMethod
    fun printText(call: PluginCall) {
        val linesArray = call.getArray("lines")
        if (linesArray == null || linesArray.length() == 0) {
            call.reject("lines is required")
            return
        }

        val lines = mutableListOf<String>()
        for (i in 0 until linesArray.length()) {
            lines.add(linesArray.getString(i))
        }

        executor.execute {
            try {
                val receipt = ReceiptPrint.init()
                for (line in lines) {
                    ReceiptPrint.addTextLine(line)
                }

                val printer = Printer.open()
                printer.print(receipt)

                call.resolve()
            } catch (e: Exception) {
                Log.e(TAG, "printText failed", e)
                call.reject("printText failed: " + e.message)
            }
        }
    }
}
