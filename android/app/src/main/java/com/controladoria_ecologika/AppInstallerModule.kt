package com.controladoria_ecologika

import android.content.ActivityNotFoundException
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.core.content.FileProvider
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.io.File

class AppInstallerModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "AppInstaller"

    @ReactMethod
    fun canInstallPackages(promise: Promise) {
        try {
            val allowed = Build.VERSION.SDK_INT < Build.VERSION_CODES.O ||
                reactContext.packageManager.canRequestPackageInstalls()

            promise.resolve(allowed)
        } catch (error: Exception) {
            promise.reject("CHECK_INSTALL_PERMISSION_FAILED", "Falha ao verificar permissão de instalação.", error)
        }
    }

    @ReactMethod
    fun openInstallSettings(promise: Promise) {
        try {
            val settingsIntent = Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES).apply {
                data = Uri.parse("package:${reactContext.packageName}")
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }

            reactContext.startActivity(settingsIntent)
            promise.resolve(true)
        } catch (error: Exception) {
            promise.reject("OPEN_INSTALL_SETTINGS_FAILED", "Falha ao abrir configurações de instalação.", error)
        }
    }

    @ReactMethod
    fun installApk(filePath: String, mimeType: String, promise: Promise) {
        try {
            val apkFile = File(filePath)

            if (!apkFile.exists()) {
                promise.reject("APK_NOT_FOUND", "Arquivo APK não encontrado para instalação.")
                return
            }

            val apkUri = FileProvider.getUriForFile(
                reactContext,
                "${reactContext.packageName}.fileprovider",
                apkFile
            )

            val installIntent = Intent(Intent.ACTION_INSTALL_PACKAGE).apply {
                data = apkUri
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                putExtra(Intent.EXTRA_NOT_UNKNOWN_SOURCE, true)
                putExtra(Intent.EXTRA_RETURN_RESULT, true)
            }

            val resolvedActivities = reactContext.packageManager.queryIntentActivities(
                installIntent,
                PackageManager.MATCH_DEFAULT_ONLY
            )

            if (resolvedActivities.isEmpty()) {
                val fallbackIntent = Intent(Intent.ACTION_VIEW).apply {
                    setDataAndType(apkUri, mimeType)
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                }

                reactContext.startActivity(fallbackIntent)
                promise.resolve(true)
                return
            }

            resolvedActivities.forEach { resolveInfo ->
                reactContext.grantUriPermission(
                    resolveInfo.activityInfo.packageName,
                    apkUri,
                    Intent.FLAG_GRANT_READ_URI_PERMISSION
                )
            }

            reactContext.startActivity(installIntent)
            promise.resolve(true)
        } catch (error: ActivityNotFoundException) {
            promise.reject("INSTALLER_NOT_FOUND", "Instalador de pacotes não encontrado.", error)
        } catch (error: Exception) {
            promise.reject("INSTALL_FAILED", "Falha ao abrir o instalador do APK.", error)
        }
    }
}
