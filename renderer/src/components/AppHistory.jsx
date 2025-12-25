import { History, Trash, Filter, ArrowUp, ArrowDown, Search, X, LayoutGrid, Rows2, Headphones, QrCode } from "lucide-react"
import { useState, useEffect, useRef } from "react";
import ConfirmModal from "./ConfirmModal"
import ConvertToMp3 from "./ConvertToMp3";
import HistoryVideoCard from "./HistoryVideoCard";
import { deleteHistory, deleteBulkHistory } from "../hooks/useHistoryManager"
import HistoryVideoCardGrid from "./HistoryVideoCardsGrid"

export default function AppHistory({ setIsHistoryOpen, isHistoryOpen }) {
    const [isAllSelected, setIsAllSelected] = useState(false);
    const [historyItems, setHistoryItems] = useState(null);
    const [selectedItems, setSelectedItems] = useState({});
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [fixedHistory, setFixedHistory] = useState([])
    const [filterBy, setFilterBy] = useState({ all: true, video: false, audio: false })
    const [sortBy, setSortBy] = useState({ date: true, title: false, size: false, res: false, reverse: true })
    const [isSearching, setIsSearching] = useState(false)
    const [confirmModalIsOpen, setConfirmModalIsOpen] = useState(false);
    const [convertModalIsOpen, setConvertModalIsOpen] = useState(false);
    const [convertTo, setConvertTo] = useState([])
    const [historyView, setHistoryView] = useState('row')
    const callbackValue = useRef(null)


    useEffect(() => {
        if (fixedHistory.length == 0) {
            (async () => {
                let data = await window.api.readHistory();
                await setHistoryItems(data.items)
                await setFixedHistory(data.items)
            })()
        }
        (async () => {
            const saved = await window.api.loadSettings();
            // return saved
            setHistoryView(saved.layout)
        })()
    }, [])

    useEffect(() => {
        function handleKeyDown(key) {
            if (!isHistoryOpen) return;

            // --- CTRL + A (Select all) ---
            if ((key.ctrlKey || key.metaKey) && key.key.toLowerCase() === 'a') {
                key.preventDefault();

                if (!isAllSelected) {
                    let newSelected = {};
                    historyItems.forEach((_, index) => (newSelected[index] = true));
                    setSelectedItems(newSelected);
                    setIsAllSelected(true);
                } else {
                    setSelectedItems({});
                    setIsAllSelected(false);
                }
                return;
            }

            // --- DELETE or BACKSPACE ---
            if ((key.key === 'Delete' || key.key === 'Backspace') && !key.target.matches('input, textarea')) {
                key.preventDefault();

                let newHistory = historyItems.filter((_, index) => !selectedItems[index]);
                setHistoryItems(newHistory);
                setSelectedItems({});
                return;
            }

            // --- ESC CLOSE FILTER ---
            if (key.key === 'Escape' && isFilterOpen) {
                key.preventDefault();
                setIsFilterOpen(false);
                return;
            }

            // --- ESC CLOSE HISTORY MODAL ---
            if (key.key === 'Escape') {
                key.preventDefault();
                setIsHistoryOpen(false);
                return;
            }
        }

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);

    }, [isHistoryOpen, isAllSelected, selectedItems, historyItems, isFilterOpen]);


    function onSelectItem(index) {
        let newSelected = { ...selectedItems };
        if (newSelected[index]) {
            delete newSelected[index];
        }
        else {
            newSelected[index] = true;
        }
        setSelectedItems(newSelected);
    }

    function handleSelectAll(e) {
        if (e.checked) {
            let newSelected = {};
            historyItems.forEach((item, index) => {
                newSelected[index] = true;
            }
            );
            setSelectedItems(newSelected);
            setIsAllSelected(true);
            e.checked = true;
        }
        else {
            setSelectedItems({});
            setIsAllSelected(false);
            e.checked = false;
        }
    }

    function sortHistory(by, default_reverse = false) {
        let sortedItems = [...historyItems];

        const sameField = sortBy[by] === true;
        const nextReverse = sameField ? !sortBy.reverse : false;

        switch (by) {
            case "date":
                sortedItems.sort((a, b) => new Date(a.date) - new Date(b.date));
                break;

            case "size":
                sortedItems.sort((a, b) => a.size - b.size);
                break;

            case "res":
                sortedItems.sort((a, b) => (a.resolution || 0) - (b.resolution || 0));
                break;

            case "title":
                sortedItems.sort((a, b) => a.title.localeCompare(b.title));
                break;

            default:
                break;
        }

        if (nextReverse && !default_reverse) sortedItems.reverse();

        setHistoryItems(sortedItems);

        setSortBy({
            date: by === "date",
            title: by === "title",
            size: by === "size",
            res: by === "res",
            reverse: !default_reverse ? nextReverse : !nextReverse,
        });
        setIsFilterOpen(false)
    }

    function filterHistory(filter) {
        let newItems = [...fixedHistory]
        setFilterBy({
            all: filter === "all",
            video: filter === "video",
            audio: filter === "audio",
        });

        switch (filter) {
            case 'video': {
                newItems = newItems.filter((item) => item.type === 'video')
                setHistoryItems(newItems)
                break;
            }
            case 'audio': {
                newItems = newItems.filter((item) => item.type.toLowerCase() === 'audio')
                setHistoryItems(newItems)
                break;
            }
            default: {
                setHistoryItems(fixedHistory)
                break;
            }
        }
        setIsFilterOpen(false)
    }

    function clearFilterAndSort() {
        setHistoryItems(fixedHistory);
        setFilterBy({ all: true, video: false, audio: false });
        setSortBy({ date: true, title: false, size: false, res: false, reverse: true });
        setIsFilterOpen(false);
    }

    function applyFilterLogic(items, filterType) {
        switch (filterType) {
            case "all": return items;
            case "video": return items.filter(x => x.type === "video");
            case "audio": return items.filter(x => x.type.toLowerCase() === "audio");
            default: return items;
        }
    }

    async function deleteItem(to_be_item) {
        if (await deleteHistory(to_be_item)) {
            // setFixedHistory(prev => {
            //     const updated = prev.filter(item => item.fileId !== to_be_item.fileId);
            //     // Reapply the active filter
            //     const activeFilter = Object.keys(filterBy).find(key => filterBy[key]);
            //     const filtered = applyFilterLogic(updated, activeFilter);

            //     // Update the visible items
            //     setHistoryItems(filtered);
            //     return updated;
            // });
            console.log(to_be_item)
        }
        else {
            alert("Failed to delete the history")
        }
    }

    async function deleteSelectedItems() {
        let newItems = [...fixedHistory]
        // console.log("old items :", newItems)
        newItems = newItems.filter((_, index) => selectedItems[index]).map(item => item.fileId)
        console.log(newItems)
        let items = await deleteBulkHistory(newItems)
        if (items) {
            setFixedHistory(prev => {
                const updated = prev.filter(item => !newItems.includes(item.fileId));
                // Reapply the active filter
                const activeFilter = Object.keys(filterBy).find(key => filterBy[key]);
                const filtered = applyFilterLogic(updated, activeFilter);
                // Update the visible items
                setHistoryItems(filtered);
                setSelectedItems({})
                return updated;
            });
        }
        else {
            alert("failted to delete")
        }
    }

    function searchFile(e) {
        let query = e.target.value.toLowerCase();
        let searchItem = [...fixedHistory]
        searchItem = searchItem.filter((item) => item.title.toLowerCase().includes(query))
        setHistoryItems(searchItem)
    }

    function convertSelectedToMp3(single = null) {
        let itemsToConvert = [];
        if (!single) {
            Object.keys(selectedItems).forEach((key) => {
                const item = historyItems[key];
                if (item.type === "video") {
                    itemsToConvert.push(item);
                }
            });
        }
        if ([single].length > 0 || itemsToConvert.length > 0) {
            setConvertTo(single ? [single] : itemsToConvert);
            setConvertModalIsOpen(true);
        }
    }

    return (
        <div className="fixed inset-0 bg-black/60 flex items-top mkb-20 justify-end z-50 animate-fadeIn p-2 gap-2">
            <ConfirmModal
                open={confirmModalIsOpen}
                title="Delete"
                description={`Are you want to delete the file from location also ! Cancle to delete history only !`}
                comfirmText="File also"
                actions={[{ name: "History only", return: 2 }]}
                callback={(value) => {
                    if (value === 0) return setConfirmModalIsOpen(false)
                }}
            />

            {(convertModalIsOpen && convertTo.length > 0) &&
                <ConvertToMp3 convertTo={convertTo} setConvertTo={setConvertTo} setConvertOpen={setConvertModalIsOpen} />
            }

            {!historyItems ? <div className="flex justify-center items-center w-full text-2xl text-gray-400" >
                <h1 className="flex gap-3 items-center"><History size={"40px"} /> History Loading....</h1></div>
                :
                <div className="bg-[#0b1220] w-full p-k6 rounded-xl border border-[#0b1220] shadow-xl p-3 min-h-40 overflow-hidden" >
                    <div className="flex flex-row mb-2 items-center relative border-b border-gray-700" style={{ WebkitAppRegion: "drag" }} >
                        {isSearching && <div className="w-full absolute top1/2 left-0 z-50 flex bg-[#0b1220] justify-start items-center px-2 borkder-b border-gray-700">
                            <input onChange={searchFile} type="search" placeholder="Search your missing file..." className="w-full bg-transparent border-none outline-none p-2 border" />
                            <button onClick={() => { setIsSearching(false); setHistoryItems(fixedHistory) }}><X /></button>
                        </div>
                        }
                        <h1 className="text-2xl text-gray-400 py-1 flex gap-3 items-center"><History /> History {historyItems.length > 0 && <p className="text-[18px]">({Object.keys(selectedItems).length > 0 && `${Object.keys(selectedItems).length} / `}{historyItems.length} Items)</p>} </h1>
                        <div className="flex justify-start items-center gap-3 me-auto ml-3 border-l border-gray-500 pl-3">
                            {historyItems.length > 0 && <>
                                <button className="p-1 rounded-lg flex items-center px-2 text-gray-400 hover:text-gray-200 gap-2 mx-1" style={{ WebkitAppRegion: "no-drag" }}
                                    onClick={() => {
                                        let s = document.getElementById("history_items")
                                        if (s.checked) {
                                            s.checked = false
                                        }
                                        else {
                                            s.checked = true
                                        }

                                        handleSelectAll(s)
                                    }
                                    }>
                                    <input id={`history_items`} onChange={() => { }} checked={isAllSelected} className="bg-blue-500" type="checkbox" />
                                    Select All
                                </button>
                                {Object.keys(selectedItems).length > 0 &&
                                    <div className="border border-gray-700 flex gap-2 px-2 py-1 rounded-full" style={{ WebkitAppRegion: "no-drag" }}>
                                        <button
                                            onClick={() => convertSelectedToMp3()}
                                            className="px-2 text-gray-400 hover:text-gray-200 mx-1 texkt-sm rounded-lg flex gap-2 items-center justify-center" title="convert into audio">
                                            Mp3
                                            <Headphones className="w-4" />
                                        </button>
                                        <button
                                            onClick={() => revealFile(item.path)}
                                            className="px-2 text-gray-400 hover:text-gray-200 mx-1 texkt-sm rounded-lg flex gap-2 items-center justify-center">
                                            <QrCode className="w-4" />
                                            Share
                                        </button>
                                        <button
                                            onClick={deleteSelectedItems}
                                            className="px-2 text-red-400 hover:text-red-500 mx-1 text-ksm rounded-lg flex gap-2 items-center justify-center">
                                            <Trash className="w-4" />
                                            Delete
                                        </button>
                                    </div>
                                }
                            </>}
                        </div>
                        <div className="flex justify-start items-center gap-3 border-e border-gray-500 pe-3" style={{ WebkitAppRegion: "no-drag" }}>
                            <button onClick={() => filterHistory("all")} className={`text-left ${filterBy['all'] ? "text-gray-200" : "text-gray-400"} hover:text-gray-200 py-1`}>All</button>
                            <button onClick={() => filterHistory("video")} className={`text-left ${filterBy['video'] ? "text-gray-200" : "text-gray-400"} hover:text-gray-200 py-1`}>Video</button>
                            <button onClick={() => filterHistory("audio")} className={`text-left ${filterBy['audio'] ? "text-gray-200" : "text-gray-400"} hover:text-gray-200 py-1`}>Audio</button>
                        </div>


                        <div className="relative me-3">
                            <div className="flex flex-row items-center" style={{ WebkitAppRegion: "no-drag" }}>
                                <button onClick={() => setIsSearching(true)} className="p-k1 rounded-lg flex items-center px-2 text-gray-400 hover:text-gray-200"><Search /></button>
                                <button className="text-gray-400  hover:text-gray-200" onClick={(e) => {
                                    setIsFilterOpen(!isFilterOpen); e.stopPropagation();
                                }} ><Filter /></button>
                                <button className="text-gray-400 hover:text-gray-200 ml-2"
                                    title="Change Page View"
                                    onClick={() => {
                                        let view = historyView === 'grid' ? "row" : "grid"
                                        { console.log(view) }
                                        setHistoryView(view)
                                    }}
                                >
                                    {historyView !== 'grid' ? <LayoutGrid size={"22px"} /> : <Rows2 size={"22px"} />}
                                </button>
                            </div>
                            {isFilterOpen &&
                                <div className="absolute top-8 right-0 bg-[#0b1220] border mt-1 border-gray-700 rounded shadow-lg w-40 p-2 z-50 ">
                                    {/* <p className="border-b border-gray-800 text-gray-300 mt-1">Filters By</p> */}
                                    <p className="border-b border-gray-800 text-gray-500">Sort By</p>
                                    <button onClick={() => sortHistory("date")} className={`ml-2 w-full text-left ${sortBy['date'] ? "text-gray-200" : "text-gray-400"} hover:text-gray-200 py-1 flex flex-row flex-nowrap- gap-2`}>Date {sortBy['date'] ? sortBy['reverse'] ? <ArrowUp className="w-3" /> : <ArrowDown className="w-3" /> : ""}</button>
                                    <button onClick={() => sortHistory("title")} className={`ml-2 w-full text-left ${sortBy['title'] ? "text-gray-200" : "text-gray-400"} hover:text-gray-200 py-1 flex flex-row flex-nowrap- gap-2`}>Name {sortBy['title'] ? sortBy['reverse'] ? <ArrowUp className="w-3" /> : <ArrowDown className="w-3" /> : ""}</button>
                                    <button onClick={() => sortHistory("size")} className={`ml-2 w-full text-left ${sortBy['size'] ? "text-gray-200" : "text-gray-400"} hover:text-gray-200 py-1 flex flex-row flex-nowrap- gap-2`}>Size {sortBy['size'] ? sortBy['reverse'] ? <ArrowUp className="w-3" /> : <ArrowDown className="w-3" /> : ""}</button>
                                    <button onClick={() => sortHistory("res")} className={`ml-2 w-full text-left ${sortBy['res'] ? "text-gray-200" : "text-gray-400"} hover:text-gray-200 py-1 flex flex-row flex-nowrap- gap-2`}>Resolution {sortBy['res'] ? sortBy['reverse'] ? <ArrowUp className="w-3" /> : <ArrowDown className="w-3" /> : ""}</button>
                                    <p className="border-b border-gray-800 text-gray-300 mt-1"></p>
                                    <button onClick={clearFilterAndSort} className="ml-2 w-full text-left text-gray-400 hover:text-gray-200 py-1">Default</button>

                                </div>
                            }
                        </div>
                        <button className="text-gray-400 hover:text-red-400 gap-2" style={{ WebkitAppRegion: "no-drag" }} onClick={() => setIsHistoryOpen(false)}><X className="ml-2" /></button>

                    </div>
                    {historyView === 'grid' &&
                        <div className="h-full max-h-[85vh] overflow-auto pe-2 border-gray-800 grid lg:grid-cols-4 md:grid-cols-3 sm:grid-cols-2 gap-3">
                            {historyItems.map((item, index) => (
                                <HistoryVideoCardGrid key={index} item={item} index={index} onSelectItem={onSelectItem} selectedItems={selectedItems} deleteItem={deleteItem} convertSelectedToMp3={convertSelectedToMp3} />
                            ))}
                            {historyItems.length === 0 && <div className="text-center text-gray-500 my-5">-- No more history --</div>}
                        </div>
                    }
                    {historyView === 'row' &&
                        <div className="h-full max-h-[85vh] overflow-auto pe-2 border-gray-800">
                            {historyItems.map((item, index) => (
                                <HistoryVideoCard key={index} item={item} index={index} onSelectItem={onSelectItem} selectedItems={selectedItems} deleteItem={deleteItem} convertSelectedToMp3={convertSelectedToMp3} />
                            ))}
                            {historyItems.length === 0 && <div className="text-center text-gray-500 my-5">-- No more history --</div>}
                        </div>
                    }
                </div>
            }

        </div>
    )
}