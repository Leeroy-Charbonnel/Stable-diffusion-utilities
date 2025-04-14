// src/lib/clipboard.ts

// Store clipboard content by type
type ClipboardData = {
    prompt?: string;
    negativePrompt?: string;
    tags?: string[];
  };
  
  let clipboardData: ClipboardData = {};
  
  export const copyToAppClipboard = (type: keyof ClipboardData, data: any) => {
    clipboardData[type] = data;
  };
  
  export const getFromAppClipboard = <T>(type: keyof ClipboardData): T | undefined => {
    return clipboardData[type] as T | undefined;
  };
  
  export const hasClipboardData = (type: keyof ClipboardData): boolean => {
    return !!clipboardData[type];
  };
  
  // Custom context menu helper
  export const handleContextMenu = (
    e: React.MouseEvent,
    type: keyof ClipboardData,
    data: any,
    actions: { copy: () => void; paste?: () => void }
  ) => {
    e.preventDefault();
    
    // Remove any existing context menus
    const existing = document.getElementById('app-context-menu');
    if (existing) existing.remove();
    
    // Create a new context menu
    const menu = document.createElement('div');
    menu.id = 'app-context-menu';
    menu.style.position = 'absolute';
    menu.style.left = `${e.clientX}px`;
    menu.style.top = `${e.clientY}px`;
    menu.style.backgroundColor = 'var(--background)';
    menu.style.border = '1px solid var(--border)';
    menu.style.borderRadius = '4px';
    menu.style.padding = '4px 0';
    menu.style.zIndex = '9999';
    menu.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
    
    // Add copy option
    const copyItem = document.createElement('div');
    copyItem.innerText = 'Copy';
    copyItem.style.padding = '6px 12px';
    copyItem.style.cursor = 'pointer';
    copyItem.style.fontSize = '14px';
    copyItem.style.color = 'var(--foreground)';
    copyItem.addEventListener('mouseover', () => {
      copyItem.style.backgroundColor = 'var(--accent)';
    });
    copyItem.addEventListener('mouseout', () => {
      copyItem.style.backgroundColor = 'transparent';
    });
    copyItem.addEventListener('click', () => {
      actions.copy();
      menu.remove();
    });
    menu.appendChild(copyItem);
    
    // Add paste option if we have data and the paste action
    if (hasClipboardData(type) && actions.paste) {
      const pasteItem = document.createElement('div');
      pasteItem.innerText = 'Paste';
      pasteItem.style.padding = '6px 12px';
      pasteItem.style.cursor = 'pointer';
      pasteItem.style.fontSize = '14px';
      pasteItem.style.color = 'var(--foreground)';
      pasteItem.addEventListener('mouseover', () => {
        pasteItem.style.backgroundColor = 'var(--accent)';
      });
      pasteItem.addEventListener('mouseout', () => {
        pasteItem.style.backgroundColor = 'transparent';
      });
      pasteItem.addEventListener('click', () => {
        actions.paste && actions.paste();
        menu.remove();
      });
      menu.appendChild(pasteItem);
    }
    
    // Add the menu to the document
    document.body.appendChild(menu);
    
    // Add a click handler to remove the menu when clicking elsewhere
    const clickHandler = (e: MouseEvent) => {
      if (!menu.contains(e.target as Node)) {
        menu.remove();
        document.removeEventListener('click', clickHandler);
      }
    };
    
    document.addEventListener('click', clickHandler);
  };