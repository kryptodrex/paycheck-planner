import { notarize } from '@electron/notarize';

export default async function notarizeApp(context) {
  const { electronPlatformName, appOutDir, packager } = context;

  if (electronPlatformName !== 'darwin') {
    return;
  }

  const appleId = process.env.APPLE_ID;
  const appleIdPassword = process.env.APPLE_APP_SPECIFIC_PASSWORD;
  const teamId = process.env.APPLE_TEAM_ID;

  if (!appleId || !appleIdPassword || !teamId) {
    console.log(
      '[notarize] Skipping notarization: APPLE_ID, APPLE_APP_SPECIFIC_PASSWORD, or APPLE_TEAM_ID is missing.'
    );
    return;
  }

  const appName = packager.appInfo.productFilename;
  const appPath = `${appOutDir}/${appName}.app`;

  console.log(`[notarize] Notarizing ${appName}.app`);

  try {
    await notarize({
      appBundleId: packager.appInfo.id,
      appPath,
      appleId,
      appleIdPassword,
      teamId,
    });

    console.log(`[notarize] Notarization complete for ${appName}.app`);
  } catch (error) {
    // Skip notarization if app is not signed (common in PR builds with CSC_FOR_PULL_REQUEST=false)
    if (error.message && error.message.includes('code object is not signed')) {
      console.log(
        '[notarize] Skipping notarization: app is not signed. This is expected in PR builds where code signing is disabled.'
      );
      return;
    }
    // Re-throw other errors
    throw error;
  }
}
