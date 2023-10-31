const SPLIT_APK_RESPONSE_TIMEOUT = 15000
const SPLIT_APK_DEFAULT_DOWNLOAD_URI = 'https://dl.dream11.in/tf/dream11.apk'
const SPLIT_APK_PATH = '/download-apk'

function startDownloadApk(downloadUri = SPLIT_APK_DEFAULT_DOWNLOAD_URI) {
  window.location = downloadUri
}

function getDownloadApk(userAgentData = null) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), SPLIT_APK_RESPONSE_TIMEOUT)
  const downloadStartTime = Date.now()

  const defaultParams = {
    page: 'D11_Home',
    platform: 'web',
    siteVersion: 'beta',
    'language': userLanguage
  }

  const url = new URL(SPLIT_APK_PATH, window.location.origin)
  if (userAgentData) {
    url.search = new URLSearchParams(userAgentData).toString()
  }

  fetch(url, {signal: controller.signal})
    .then(async (response) => {
      const streamResponse = await response.json()
      const status = response.status

      // user_agent is already a property by default for event
      if (streamResponse?.data?.uri) {
        D11Data.track('SplitApkSuccess', Object.assign(
          defaultParams,
          userAgentData,
          {
            downloadUri: streamResponse?.data?.uri,
            arch: streamResponse?.data?.arch,
            responseTime: Date.now() - downloadStartTime,
            status
          }
        ))
      } else {
        D11Data.track('SplitApkError', Object.assign(
          defaultParams,
          userAgentData,
          {
            errorMessage: streamResponse?.error?.message,
            cause: streamResponse?.error?.cause,
            responseTime: Date.now() - downloadStartTime,
            status
          }
        ))
      }
      startDownloadApk(streamResponse?.data?.uri || undefined)
    })
    .catch(error => {
      // user_agent is already a property by default for event
      D11Data.track('SplitApkError', Object.assign(
        defaultParams,
        userAgentData,
        {
          errorMessage: error?.name === 'AbortError' ? 'timeout' : error?.message,
          cause: typeof error?.cause === 'string' ? error?.cause : '',
          responseTime: Date.now() - downloadStartTime,
          status: 0
        }
      ))
      startDownloadApk()
    })
    .finally(() => {
      clearTimeout(timeoutId)
    })
}

function downloadApk() {
  try {
    /**
     * New chrome version
     * For chrome version greater than 110 in android, the user-agent will not contain model number information.
     * Instead there is an alternative which is navigator.userAgentData
     */
    if (window?.navigator?.userAgentData?.getHighEntropyValues) {
      /**
       * returned values are:
       *       architecture
       *       bitness
       *       mobile
       *       model
       *       platform
       *       platformVersion
       */
      window?.navigator?.userAgentData?.getHighEntropyValues?.(['architecture', 'model', 'bitness', 'platformVersion'])
        .then((response) => {
          getDownloadApk({
            architecture: response?.architecture,
            bitness: response?.bitness,
            mobile: response?.mobile,
            model: response?.model,
            platform: response?.platform,
            platformVersion: response?.platformVersion
          })
        })
        .catch(() => getDownloadApk())
    } else {
      /**
       * For older version of chrome or other browsers, send only user_agent
       */
      getDownloadApk()
    }
  } catch (e) {
    startDownloadApk()
  }
}
