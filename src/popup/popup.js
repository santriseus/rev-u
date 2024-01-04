(async function () {
    function bytesToSize(bytes, decimals = 2) {
        if (!Number(bytes)) {
            return '0 Bytes';
        }

        const kbToBytes = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = [
            'Bytes',
            'KiB',
            'MiB',
            'GiB',
            'TiB',
            'PiB',
            'EiB',
            'ZiB',
            'YiB',
        ];

        const index = Math.floor(
            Math.log(bytes) / Math.log(kbToBytes),
        );

        return `${parseFloat(
            (bytes / Math.pow(kbToBytes, index)).toFixed(dm),
        )} ${sizes[index]}`;
    }
    const button =  document.getElementById('button');
    const cleanButton =  document.getElementById('clean');

    async function refreshBytes() {
        const bytes = await chrome.storage.sync.getBytesInUse();
        const bytesInfo = document.getElementById('bytes');
        bytesInfo.innerText = `Storage: ${bytesToSize(bytes)} of 500 KiB is in use.`
    }

    await refreshBytes();

    const {settings} =  await chrome.storage.sync.get("settings")
    if (settings?.enabled === undefined){
        await chrome.storage.sync.set({"settings" : {...settings, enabled: true}});
    }
    button.setAttribute('class', (settings?.enabled === undefined || settings.enabled) ? 'active': '');
    button.onclick = async ()=>{
        const {settings} =  await chrome.storage.sync.get("settings");
        console.log(settings);
        await chrome.storage.sync.set({"settings" : {...settings, enabled: !settings?.enabled}});
        button.setAttribute('class', !settings?.enabled ? 'active': '');
    }
    cleanButton.onclick = async ()=>{
        const {settings} =  await chrome.storage.sync.get("settings");
        await chrome.storage.sync.clear();
        await chrome.storage.sync.set({"settings" : {...settings}});
        await refreshBytes();
    };
}());