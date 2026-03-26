document.addEventListener("DOMContentLoaded", () => {
    const folderTree = document.getElementById("folder-tree");
    const bookmarkGrid = document.getElementById("bookmark-grid");
    const currentFolderTitle = document.getElementById("current-folder-title");
    const searchInput = document.getElementById("search-input");
    const mainContent = document.querySelector(".main-content");
    
    let currentFolderId = "1"; // Default Bookmarks Bar
    
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

    function createBookmarkCard(bookmark) {
        const card = document.createElement("a");
        card.className = "bookmark-card";
        card.href = bookmark.url;
        card.target = "_blank";
        card.dataset.id = bookmark.id;
        card.draggable = true;
        
        const iconUrl = getFaviconUrl(bookmark.url);
        const imgTag = iconUrl ? `<img src="${iconUrl}" alt="">` : `<span>🌐</span>`;
        
        card.innerHTML = `
            <div class="bookmark-icon">${imgTag}</div>
            <div class="bookmark-meta">
                <div class="bookmark-title">${bookmark.title || "Untitled"}</div>
                <div class="bookmark-url">${bookmark.url}</div>
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
            }
        });

        return card;
    }

    function renderBookmarks(nodes) {
        bookmarkGrid.innerHTML = "";
        const links = nodes.filter(n => n.url);
        if (links.length === 0) {
            bookmarkGrid.innerHTML = '<p style="color: var(--text-secondary); grid-column: 1/-1; text-align: center;">No links in this folder</p>';
            return;
        }
        links.forEach(link => {
            bookmarkGrid.appendChild(createBookmarkCard(link));
        });
    }

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
            });
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
});
