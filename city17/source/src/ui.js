const log = () => document.getElementById("chat-log");
const input = () => document.getElementById("chat-input");

export const isTyping = () => document.activeElement === input();

export function initChat(room) {
  const el = input();
  window.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !isTyping()) { e.preventDefault(); el.focus(); }
    else if (e.key === "Escape" && isTyping()) el.blur();
  });
  el.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    e.stopPropagation();
    if (el.value.trim()) room.send("chat", el.value);
    el.value = ""; el.blur();
  });
}

export function pushChat({ kind = "info", text }) {
  const l = log(), line = document.createElement("div");
  line.className = `k-${kind}`; line.textContent = text;
  l.appendChild(line);
  while (l.children.length > 120) l.firstChild.remove();
  l.scrollTop = l.scrollHeight;
}
