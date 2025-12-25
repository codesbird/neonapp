export async function saveHistory(new_history) {
    try {
        let data = await window.api.readHistory();
        let items = data.items;
        items.splice(0, 0, new_history);
        data.items = items;
        await window.api.setHistory(data)
        return true;
    }
    catch (er) {
        return false;
    }
}

export async function deleteHistory(history_item) {
    try {
        // let data = await window.api.readHistory();
        // let items = data.items;
        // items = items.filter((item) => item.fileId !== history_item.fileId)
        // data.items = items;
        // await window.api.setHistory(data)
        console.log(history_item,"path ")
        await window.api.deleteFile(history_item.thumbnail)
        return true;
    }
    catch (er) {
        console.log(er)
        return false;
    }
}
export async function deleteBulkHistory(history_ids) {
    try {
        if (!Array.isArray(history_ids)) return false;

        let data = await window.api.readHistory();
        let items = data.items;
        items = items.filter((item) => !history_ids.includes(item.fileId))
        data.items = items;
        await window.api.setHistory(data)
        return true;
    }
    catch (er) {
        console.log(er)
        return false;
    }
}

export async function getHistory() {
    try {
        let data = await window.api.readHistory();
        return data;
    }
    catch (er) {
        return false;
    }
}