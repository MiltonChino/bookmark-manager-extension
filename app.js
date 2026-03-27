document.addEventListener("DOMContentLoaded", () => {
    const folderTree = document.getElementById("folder-tree");
    const bookmarkGrid = document.getElementById("bookmark-grid");
    const currentFolderTitle = document.getElementById("current-folder-title");
    const searchInput = document.getElementById("search-input");
    const mainContent = document.querySelector(".main-content");
    
    let currentFolderId = "1"; // Default Bookmarks Bar
    const expandedFolders = new Set(); // To maintain sidebar state
    
    // --- Selection Box Logistics ---
    let isSelecting = false;
    let startX = 0, startY = 0;
    let selectionBox = null;
    
    // Prevent text selection broadly during drag
    document.body.style.userSelect = "none";
    
    function clearSelection() {
        document.querySelectorAll(".bookmark-card.selected").forEach(c => c.classList.remove("selected"));
    }

    mainContent.addEventListener("mousedown", (e) => {
        // If they click on a card, do not start marquee
        if (e.target.closest(".bookmark-card")) return;
        if (e.button !== 0) return; // Only left click

        isSelecting = true;
        startX = e.pageX;
        startY = e.pageY;
        
        if (!e.ctrlKey && !e.shiftKey) clearSelection();

        selectionBox = document.createElement("div");
        selectionBox.className = "selection-box";
        selectionBox.style.left = startX + "px";
        selectionBox.style.top = startY + "px";
        document.body.appendChild(selectionBox);
        
        e.preventDefault(); // Stop text highlighting cursor sweeps
    });

    document.addEventListener("mousemove", (e) => {
        if (!isSelecting || !selectionBox) return;

        const currentX = e.pageX;
        const currentY = e.pageY;
        
        const left = Math.min(startX, currentX);
        const top = Math.min(startY, currentY);
        const width = Math.abs(currentX - startX);
        const height = Math.abs(currentY - startY);

        selectionBox.style.left = left + "px";
        selectionBox.style.top = top + "px";
        selectionBox.style.width = width + "px";
        selectionBox.style.height = height + "px";

        const rect = selectionBox.getBoundingClientRect();
        document.querySelectorAll(".bookmark-card").forEach(card => {
            const cardRect = card.getBoundingClientRect();
            const isOverlapping = !(
                rect.right < cardRect.left || 
                rect.left > cardRect.right || 
                rect.bottom < cardRect.top || 
                rect.top > cardRect.bottom
            );
            
            if (!e.ctrlKey) {
                card.classList.toggle("selected", isOverlapping);
            }
        });
    });

    document.addEventListener("mouseup", () => {
        if (isSelecting) {
            isSelecting = false;
            if (selectionBox) {
                selectionBox.remove();
                selectionBox = null;
            }
        }
    });

    function getFaviconUrl(url) {
        try { return `https://www.google.com/s2/favicons?sz=64&domain=${new URL(url).hostname}`; }
        catch (e) { return null; }
    }

    function reloadCurrentFolder() {
        chrome.bookmarks.getChildren(currentFolderId, renderBookmarks);
    }

    function createItemCard(node) {
        const isFolder = !node.url;
        const card = document.createElement(isFolder ? "div" : "a");
        card.className = "bookmark-card" + (isFolder ? " is-folder" : "");
        if (!isFolder) {
            card.href = node.url;
            card.target = "_blank";
        }
        card.dataset.id = node.id;
        card.draggable = true;
        
        let iconHtml;
        if (isFolder) {
            iconHtml = `<span style="font-size: 1.2rem;">📁</span>`;
        } else {
            const iconUrl = getFaviconUrl(node.url);
            iconHtml = iconUrl ? `<img src="${iconUrl}" alt="">` : `<span>🌐</span>`;
        }
        
        card.innerHTML = `
            <div class="bookmark-icon">${iconHtml}</div>
            <div class="bookmark-meta">
                <div class="bookmark-title">${node.title || "Untitled"}</div>
                ${!isFolder ? `<div class="bookmark-url">${node.url}</div>` : ""}
            </div>
        `;
        
        card.addEventListener('dragstart', (e) => {
            if (!card.classList.contains("selected")) {
                clearSelection();
                card.classList.add("selected");
            }
            
            const selectedCards = document.querySelectorAll('.bookmark-card.selected');
            const selectedIds = Array.from(selectedCards).map(c => c.dataset.id);
            
            e.dataTransfer.setData("application/json", JSON.stringify(selectedIds));
            e.dataTransfer.effectAllowed = "move";
            
            setTimeout(() => {
                selectedCards.forEach(c => c.classList.add("dragging"));
            }, 0);
        });
        
        card.addEventListener('dragend', () => {
            document.querySelectorAll(".bookmark-card").forEach(c => c.classList.remove("dragging"));
        });
        
        card.addEventListener("click", (e) => {
            if (e.ctrlKey || e.metaKey || e.shiftKey) {
                e.preventDefault();
                card.classList.toggle("selected");
            } else if (isFolder) {
                // Double-click to open folder? Actually, a single click on a folder in the grid could just open it, 
                // but let's make it a double click to avoid annoying users if they misclick while selecting
                // Wait, native behavior is usually double click. Let's do double click for now:
            }
        });

        if (isFolder) {
            card.addEventListener("dblclick", () => {
                document.querySelectorAll(".folder-item").forEach(el => el.classList.remove("active"));
                const sidebarRow = document.querySelector(`.folder-item[data-id="${node.id}"]`);
                if(sidebarRow) sidebarRow.classList.add("active");
                currentFolderTitle.textContent = node.title;
                currentFolderId = node.id;
                reloadCurrentFolder();
            });
            // Also allow folder card to be a drop target for moving INTO it
            card.addEventListener("dragover", (e) => {
                const targetCard = e.target.closest('.bookmark-card');
                const rect = targetCard.getBoundingClientRect();
                const xRatio = (e.clientX - rect.left) / rect.width;
                const yRatio = (e.clientY - rect.top) / rect.height;
                // Center 50% = drop into folder
                if (xRatio > 0.25 && xRatio < 0.75 && yRatio > 0.25 && yRatio < 0.75) {
                    e.preventDefault();
                    e.stopPropagation(); // prevent grid dragover handling
                    document.querySelectorAll('.drag-over-before, .drag-over-after').forEach(el => el.classList.remove('drag-over-before', 'drag-over-after'));
                    card.classList.add("drag-over-into");
                    e.dataTransfer.dropEffect = "move";
                }
            });
            card.addEventListener("dragleave", () => card.classList.remove("drag-over-into"));
            card.addEventListener("drop", (e) => {
                if (card.classList.contains("drag-over-into")) {
                    e.preventDefault();
                    e.stopPropagation();
                    card.classList.remove("drag-over-into");
                    
                    const data = e.dataTransfer.getData("application/json");
                    if (data) {
                        try {
                            const idsToMove = JSON.parse(data);
                            if (idsToMove.includes(node.id)) return; // can't move a folder into itself
                            Promise.all(idsToMove.map(id => chrome.bookmarks.move(id, { parentId: node.id }))).then(() => {
                                clearSelection();
                                reloadCurrentFolder();
                            });
                        } catch (err) {}
                    }
                }
            });
        }

        return card;
    }

    function renderBookmarks(nodes) {
        bookmarkGrid.innerHTML = "";
        if (nodes.length === 0) {
            bookmarkGrid.innerHTML = '<p style="color: var(--text-secondary); grid-column: 1/-1; text-align: center;">This folder is empty</p>';
            return;
        }
        nodes.forEach(node => {
            bookmarkGrid.appendChild(createItemCard(node));
        });
    }

    // Grid Drag and Drop Reordering
    bookmarkGrid.addEventListener("dragover", (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";

        const targetCard = e.target.closest(".bookmark-card");
        document.querySelectorAll(".drag-over-before, .drag-over-after").forEach(el => el.classList.remove("drag-over-before", "drag-over-after"));

        if (targetCard && !targetCard.classList.contains("dragging") && !targetCard.classList.contains("drag-over-into")) {
            const rect = targetCard.getBoundingClientRect();
            // Use X axis for horizontal row flow
            const xRatio = (e.clientX - rect.left) / rect.width;
            if (xRatio > 0.5) {
                targetCard.classList.add("drag-over-after");
            } else {
                targetCard.classList.add("drag-over-before");
            }
        }
    });

    bookmarkGrid.addEventListener("dragleave", (e) => {
        if (!bookmarkGrid.contains(e.relatedTarget)) {
            document.querySelectorAll(".drag-over-before, .drag-over-after").forEach(el => el.classList.remove("drag-over-before", "drag-over-after"));
        }
    });

    bookmarkGrid.addEventListener("drop", async (e) => {
        // Did we drop onto a card to move into it? (handled by card drop)
        if (e.target.closest('.drag-over-into')) return;

        e.preventDefault();
        
        const targetCard = document.querySelector(".drag-over-before, .drag-over-after");
        document.querySelectorAll(".drag-over-before, .drag-over-after").forEach(el => el.classList.remove("drag-over-before", "drag-over-after"));

        const dataText = e.dataTransfer.getData("application/json");
        if (!dataText || !targetCard) return;

        try {
            const idsToMove = JSON.parse(dataText);
            if (!idsToMove.length) return;

            let targetId = targetCard.dataset.id;
            let insertAfter = targetCard.classList.contains("drag-over-after");

            if (idsToMove.includes(targetId)) return; // Prevent target reference loops

            for (let i = 0; i < idsToMove.length; i++) {
                const id = idsToMove[i];
                const newChildren = await new Promise(r => chrome.bookmarks.getChildren(currentFolderId, r));
                let baseIndex = newChildren.findIndex(c => c.id === targetId);
                if (baseIndex === -1) break;

                let insertIndex = insertAfter ? baseIndex + 1 : baseIndex;
                await new Promise(r => chrome.bookmarks.move(id, { parentId: currentFolderId, index: insertIndex }, r));

                targetId = id;
                insertAfter = true;
            }

            clearSelection();
            reloadCurrentFolder();
        } catch (err) {
            console.error("Drop failed:", err);
        }
    });

    function createFolderNode(node, depth = 0) {
        if (node.url) return null; // We only render folders in the sidebar

        const hasFolderChildren = node.children && node.children.some(c => !c.url);
        
        if (node.id === "0") {
            // Root node itself is historically hidden so we cleanly render its children
            const frag = document.createDocumentFragment();
            if (node.children) {
                node.children.forEach(child => {
                    const childEl = createFolderNode(child, 0);
                    if (childEl) frag.appendChild(childEl);
                });
            }
            return frag;
        }

        const title = node.title || "Unnamed";
        const container = document.createElement("div");
        container.className = "folder-container";
        
        const row = document.createElement("div");
        row.className = `folder-item depth-${depth}`;
        row.dataset.id = node.id;
        row.style.paddingLeft = `${depth * 16 + 12}px`;

        const arrowBtn = document.createElement("span");
        arrowBtn.className = "folder-toggle";
        arrowBtn.innerHTML = hasFolderChildren ? "▶" : "<span style='opacity:0'>▶</span>"; 
        arrowBtn.style.marginRight = "6px";
        arrowBtn.style.cursor = "pointer";
        arrowBtn.style.display = "inline-block";
        arrowBtn.style.width = "14px";
        arrowBtn.style.textAlign = "center";

        row.innerHTML = `<span style="margin-right:4px;">📁</span> ${title}`;
        row.prepend(arrowBtn);

        container.appendChild(row);

        const childrenContainer = document.createElement("div");
        childrenContainer.className = "folder-children";
        childrenContainer.style.display = "none"; // Default hidden

        if (hasFolderChildren) {
            node.children.forEach(child => {
                const childEl = createFolderNode(child, depth + 1);
                if (childEl) childrenContainer.appendChild(childEl);
            });
            container.appendChild(childrenContainer);
            
            arrowBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                const isExpanded = childrenContainer.style.display !== "none";
                childrenContainer.style.display = isExpanded ? "none" : "block";
                arrowBtn.innerHTML = isExpanded ? "▶" : "▼";
                if (isExpanded) {
                    expandedFolders.delete(node.id);
                } else {
                    expandedFolders.add(node.id);
                }
            });

            if (expandedFolders.has(node.id)) {
                childrenContainer.style.display = "block";
                arrowBtn.innerHTML = "▼";
            }
        }

        // Drag Events for Folder Drop Targets
        row.addEventListener("dragover", (e) => {
            e.preventDefault();
            row.classList.add("drag-over");
            e.dataTransfer.dropEffect = "move";
        });
        
        row.addEventListener("dragleave", () => row.classList.remove("drag-over"));
        
        row.addEventListener("drop", (e) => {
            e.preventDefault();
            row.classList.remove("drag-over");
            const data = e.dataTransfer.getData("application/json");
            
            if (data) {
                try {
                    const idsToMove = JSON.parse(data);
                    const targetFolderId = row.dataset.id;
                    
                    let movePromises = idsToMove.map(id => {
                        return chrome.bookmarks.move(id, { parentId: targetFolderId });
                    });
                    
                    Promise.all(movePromises).then(() => {
                        clearSelection();
                        reloadCurrentFolder();
                    });
                } catch (err) {}
            }
        });

        row.addEventListener("click", () => {
            document.querySelectorAll(".folder-item").forEach(el => el.classList.remove("active"));
            row.classList.add("active");
            currentFolderTitle.textContent = title;
            currentFolderId = node.id;
            reloadCurrentFolder();
        });

        return container;
    }

    function renderFolders(tree) {
        folderTree.innerHTML = "";
        tree.forEach(rootNode => {
            const el = createFolderNode(rootNode);
            if (el) folderTree.appendChild(el);
        });
    }

    chrome.bookmarks.getTree((tree) => {
        renderFolders(tree);
        // Default jump
        chrome.bookmarks.getChildren("1", (children) => {
            if(children) {
                currentFolderTitle.textContent = "Bookmarks Bar";
                currentFolderId = "1";
                renderBookmarks(children);
                
                const defaultFolderRow = document.querySelector(`.folder-item[data-id="1"]`);
                if(defaultFolderRow) defaultFolderRow.classList.add("active");
            }
        });
    });
    
    searchInput.addEventListener("input", (e) => {
        const query = e.target.value.trim();
        if (query.length > 0) {
            currentFolderTitle.textContent = `Search Results: "${query}"`;
            chrome.bookmarks.search(query, renderBookmarks);
        } else {
            chrome.bookmarks.getChildren("1", (children) => {
                currentFolderTitle.textContent = "Bookmarks Bar";
                currentFolderId = "1";
                renderBookmarks(children);
            });
        }
    });

    // --- Custom Context Menu ---
    const contextMenu = document.createElement("div");
    contextMenu.className = "context-menu";
    contextMenu.style.display = "none";
    document.body.appendChild(contextMenu);

    let currentContextNodeId = null;
    let currentContextIsFolder = false;

    document.addEventListener("contextmenu", (e) => {
        const card = e.target.closest(".bookmark-card");
        const folderItem = e.target.closest(".folder-item");
        
        let targetEl = card || folderItem;
        if (!targetEl) {
            contextMenu.style.display = "none";
            return;
        }

        e.preventDefault();
        
        currentContextNodeId = targetEl.dataset.id;
        currentContextIsFolder = card ? card.classList.contains("is-folder") : !!folderItem;

        contextMenu.innerHTML = currentContextIsFolder ? `
            <div class="context-menu-item" id="ctx-rename">✏️ Rename</div>
            <div class="context-menu-divider"></div>
            <div class="context-menu-item" id="ctx-delete" style="color: #ef4444;">🗑️ Delete</div>
        ` : `
            <div class="context-menu-item" id="ctx-edit">✏️ Edit Label/URL</div>
            <div class="context-menu-divider"></div>
            <div class="context-menu-item" id="ctx-delete" style="color: #ef4444;">🗑️ Delete</div>
        `;
        
        // Ensure menu doesn't go off-screen
        contextMenu.style.display = "block";
        const menuRect = contextMenu.getBoundingClientRect();
        
        let x = e.pageX;
        let y = e.pageY;
        
        if (x + menuRect.width > window.innerWidth) x -= menuRect.width;
        if (y + menuRect.height > window.innerHeight) y -= menuRect.height;
        
        contextMenu.style.left = `${x}px`;
        contextMenu.style.top = `${y}px`;
    });

    document.addEventListener("click", (e) => {
        if (e.target.closest(".context-menu")) {
            const id = e.target.id;
            
            if (id === "ctx-rename") {
                chrome.bookmarks.get(currentContextNodeId, (results) => {
                    if (results.length) {
                        const newTitle = prompt("Enter new folder name:", results[0].title);
                        if (newTitle !== null && newTitle.trim() !== "") {
                            chrome.bookmarks.update(currentContextNodeId, { title: newTitle.trim() }, () => {
                                reloadCurrentFolder();
                                chrome.bookmarks.getTree(renderFolders);
                            });
                        }
                    }
                });
            } else if (id === "ctx-edit") {
                chrome.bookmarks.get(currentContextNodeId, (results) => {
                    if (results.length) {
                        const newTitle = prompt("Enter new bookmark name:", results[0].title);
                        if (newTitle === null) return;
                        
                        const newUrl = prompt("Enter new URL:", results[0].url || "");
                        if (newUrl === null) return;
                        
                        chrome.bookmarks.update(currentContextNodeId, { 
                            title: newTitle.trim(),
                            url: newUrl.trim()
                        }, () => {
                            reloadCurrentFolder();
                        });
                    }
                });
            } else if (id === "ctx-delete") {
                if (confirm("Are you sure you want to delete this?")) {
                    if (currentContextIsFolder) {
                        chrome.bookmarks.removeTree(currentContextNodeId, () => {
                            reloadCurrentFolder();
                            chrome.bookmarks.getTree(renderFolders);
                        });
                    } else {
                        chrome.bookmarks.remove(currentContextNodeId, () => {
                            reloadCurrentFolder();
                        });
                    }
                }
            }
            contextMenu.style.display = "none";
        } else {
            // Clicked outside
            contextMenu.style.display = "none";
        }
    });
});
