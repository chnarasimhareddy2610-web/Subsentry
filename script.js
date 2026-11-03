let subscriptions = JSON.parse(localStorage.getItem("subscriptions")) || [];

// ─── Custom Calendar ───────────────────────────────────────────────

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS   = ["Su","Mo","Tu","We","Th","Fr","Sa"];

function createCalendar(calId, inputId) {
    const cal   = document.getElementById(calId);
    const input = document.getElementById(inputId);
    const today = new Date();

    let viewYear  = today.getFullYear();
    let viewMonth = today.getMonth();
    let selectedDate = null;

    function render() {
        cal.innerHTML = "";

        const header = document.createElement("div");
        header.className = "cal-header";
        header.innerHTML = `
            <button id="prev-${calId}">‹</button>
            <span class="cal-title">${MONTHS[viewMonth]} ${viewYear}</span>
            <button id="next-${calId}">›</button>
        `;
        cal.appendChild(header);

        header.querySelector(`#prev-${calId}`).addEventListener("click", e => {
            e.stopPropagation();
            viewMonth--; if (viewMonth < 0) { viewMonth = 11; viewYear--; } render();
        });
        header.querySelector(`#next-${calId}`).addEventListener("click", e => {
            e.stopPropagation();
            viewMonth++; if (viewMonth > 11) { viewMonth = 0; viewYear++; } render();
        });

        const daysHeader = document.createElement("div");
        daysHeader.className = "cal-days-header";
        DAYS.forEach(d => { const s = document.createElement("span"); s.textContent = d; daysHeader.appendChild(s); });
        cal.appendChild(daysHeader);

        const grid = document.createElement("div");
        grid.className = "cal-grid";

        const firstDay = new Date(viewYear, viewMonth, 1).getDay();
        const totalDays = new Date(viewYear, viewMonth + 1, 0).getDate();

        for (let i = 0; i < firstDay; i++) {
            const empty = document.createElement("div");
            empty.className = "cal-day empty";
            grid.appendChild(empty);
        }
        for (let d = 1; d <= totalDays; d++) {
            const cell = document.createElement("div");
            cell.className = "cal-day";
            cell.textContent = d;

            const isToday = d === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();
            if (isToday) cell.classList.add("today");

            if (selectedDate &&
                d === selectedDate.getDate() &&
                viewMonth === selectedDate.getMonth() &&
                viewYear === selectedDate.getFullYear()) {
                cell.classList.add("selected");
            }

            cell.addEventListener("click", e => {
                e.stopPropagation();
                selectedDate = new Date(viewYear, viewMonth, d);
                render();
            });
            grid.appendChild(cell);
        }
        cal.appendChild(grid);

        const actions = document.createElement("div");
        actions.className = "cal-actions";
        actions.innerHTML = `<button class="clear-btn">Clear</button><button class="confirm">OK</button>`;
        cal.appendChild(actions);

        actions.querySelector(".confirm").addEventListener("click", e => {
            e.stopPropagation();
            if (selectedDate) {
                const yyyy = selectedDate.getFullYear();
                const mm   = String(selectedDate.getMonth() + 1).padStart(2, "0");
                const dd   = String(selectedDate.getDate()).padStart(2, "0");
                input.value = `${yyyy}-${mm}-${dd}`;
            }
            cal.classList.remove("open");
        });
        actions.querySelector(".clear-btn").addEventListener("click", e => {
            e.stopPropagation();
            selectedDate = null;
            input.value  = "";
            render();
        });
    }

    function positionCalendar() {
        cal.style.left = "0";
        cal.style.right = "auto";
        cal.style.top = "calc(100% + 8px)";
        cal.style.bottom = "auto";
        requestAnimationFrame(() => {
            const rect = cal.getBoundingClientRect();
            const buffer = 12;
            if (rect.right > window.innerWidth - buffer) {
                cal.style.left = "auto";
                cal.style.right = "0";
            }
            if (rect.bottom > window.innerHeight - buffer) {
                cal.style.top = "auto";
                cal.style.bottom = "calc(100% + 8px)";
            }
        });
    }

    // Toggle open
    input.addEventListener("click", e => {
        e.stopPropagation();
        // Close all other calendars
        document.querySelectorAll(".custom-calendar.open").forEach(c => { if (c !== cal) c.classList.remove("open"); });
        cal.classList.toggle("open");
        if (cal.classList.contains("open")) {
            render();
            positionCalendar();
        }
    });

    window.addEventListener("resize", () => {
        if (cal.classList.contains("open")) positionCalendar();
    });

    // Close on outside click
    document.addEventListener("click", e => {
        if (!cal.contains(e.target) && e.target !== input) {
            cal.classList.remove("open");
        }
    });
}

// Init both calendars after DOM ready
document.addEventListener("DOMContentLoaded", () => {
    createCalendar("startCal", "startDate");
    createCalendar("endCal",   "endDate");
    displayData();
});

// ─── Core App ─────────────────────────────────────────────────────

function saveData() {
    localStorage.setItem("subscriptions", JSON.stringify(subscriptions));
}

function formatCurrency(amount) {
    return "₹" + amount.toFixed(2);
}

function getCategoryClass(cat) {
    const map = {
        "Entertainment": "pill-entertainment",
        "Productivity":  "pill-productivity",
        "Fitness":       "pill-fitness",
        "Education":     "pill-education",
        "Music":         "pill-music",
        "Other":         "pill-other"
    };
    return map[cat] || "pill-other";
}

function addSubscription() {
    const customerName        = document.getElementById("customerName").value.trim();
    const subscriptionChannel = document.getElementById("subscriptionChannel").value.trim();
    const cost                = parseFloat(document.getElementById("cost").value);
    const category            = document.getElementById("category").value;
    const startDate           = document.getElementById("startDate").value;
    const endDate             = document.getElementById("endDate").value;

    if (!customerName || !subscriptionChannel || isNaN(cost) || !startDate) {
        showToast("Please fill in all required fields.");
        return;
    }

    subscriptions.push({ customerName, subscriptionChannel, cost, category, startDate, endDate });
    saveData();
    clearForm();
    displayData();
    showToast("✅ Subscription added!", "success");
}

function clearForm() {
    ["customerName","subscriptionChannel","cost","startDate","endDate"].forEach(id => {
        document.getElementById(id).value = "";
    });
    document.getElementById("category").selectedIndex = 0;
}

function deleteSubscription(index) {
    if (confirm("Delete this subscription?")) {
        subscriptions.splice(index, 1);
        saveData();
        displayData();
    }
}

function getActiveMonthsInYear(startDate, endDate, year) {
    if (!startDate) return 0;

    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : new Date(year, 11, 31);
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year, 11, 31);

    const overlapStart = start > yearStart ? start : yearStart;
    const overlapEnd = end < yearEnd ? end : yearEnd;

    if (overlapEnd < overlapStart) return 0;

    return (
        (overlapEnd.getFullYear() - overlapStart.getFullYear()) * 12 +
        (overlapEnd.getMonth() - overlapStart.getMonth()) + 1
    );
}

function displayData() {
    const list = document.getElementById("list");
    list.innerHTML = "";

    let totalMonthly = 0;
    let currentYearTotal = 0;
    let previousYearTotal = 0;

    const currentYear  = new Date().getFullYear();
    const previousYear = currentYear - 1;

    subscriptions.forEach((sub, index) => {
        totalMonthly += sub.cost;

        const monthsThisYear = getActiveMonthsInYear(sub.startDate, sub.endDate, currentYear);
        const monthsLastYear = getActiveMonthsInYear(sub.startDate, sub.endDate, previousYear);

        currentYearTotal  += sub.cost * monthsThisYear;
        previousYearTotal += sub.cost * monthsLastYear;

        const pillClass = getCategoryClass(sub.category);
        const endDisplay = sub.endDate || "—";

        const row = document.createElement("tr");
        row.style.animationDelay = `${index * 0.05}s`;
        row.innerHTML = `
            <td><strong>${sub.customerName}</strong></td>
            <td>${sub.subscriptionChannel}</td>
            <td><strong style="color:#38bdf8">${formatCurrency(sub.cost)}</strong></td>
            <td><span class="category-pill ${pillClass}">${sub.category}</span></td>
            <td>${sub.startDate}</td>
            <td>${endDisplay}</td>
            <td><button class="delete-btn" onclick="deleteSubscription(${index})">Delete</button></td>
        `;
        list.appendChild(row);
    });

    // Animate counter
    animateCounter("monthly",  totalMonthly);
    animateCounter("yearly",   currentYearTotal);
    animateCounter("previous", previousYearTotal);
    document.getElementById("count").textContent = subscriptions.length;

    generateTips(totalMonthly);
}

function animateCounter(id, target) {
    const el = document.getElementById(id);
    const start = parseFloat(el.textContent.replace("₹","")) || 0;
    const duration = 600;
    const step = 16;
    const diff = target - start;
    let elapsed = 0;

    const timer = setInterval(() => {
        elapsed += step;
        const progress = Math.min(elapsed / duration, 1);
        const ease = 1 - Math.pow(1 - progress, 3);
        el.textContent = formatCurrency(start + diff * ease);
        if (progress >= 1) clearInterval(timer);
    }, step);
}

function generateTips(totalMonthly) {
    const tips = document.getElementById("tips");
    tips.innerHTML = "";

    if (subscriptions.length === 0) {
        tips.innerHTML = "<li>No subscriptions added yet. Add one above to get started!</li>";
        return;
    }

    const tipsList = [];

    if (totalMonthly > 5000)
        tipsList.push("You're spending more than ₹5,000/month. Review high-cost subscriptions and consider consolidating.");

    const entertainmentCount = subscriptions.filter(s => s.category === "Entertainment").length;
    if (entertainmentCount >= 3)
        tipsList.push(`You have ${entertainmentCount} entertainment subscriptions. Consider cancelling unused streaming services.`);

    const expensiveSubs = subscriptions.filter(s => s.cost >= 1000);
    if (expensiveSubs.length > 0)
        tipsList.push(`${expensiveSubs.length} subscription(s) cost ₹1,000 or more monthly. Check if annual plans offer discounts.`);

    const expiredSubs = subscriptions.filter(s => s.endDate && new Date(s.endDate) < new Date());
    if (expiredSubs.length > 0)
        tipsList.push(`${expiredSubs.length} subscription(s) appear to have passed their end date. Review and remove if no longer active.`);

    if (tipsList.length === 0)
        tipsList.push("Your subscriptions look well-optimized! Keep monitoring to stay on track. 🎉");

    tipsList.forEach(tip => {
        tips.innerHTML += `<li>${tip}</li>`;
    });
}

// ─── Toast Notification ───────────────────────────────────────────

function showToast(msg, type = "error") {
    const existing = document.getElementById("toast");
    if (existing) existing.remove();

    const toast = document.createElement("div");
    toast.id = "toast";
    toast.textContent = msg;
    Object.assign(toast.style, {
        position: "fixed",
        bottom: "30px",
        right: "30px",
        background: type === "success"
            ? "linear-gradient(135deg,#34d399,#059669)"
            : "linear-gradient(135deg,#ef4444,#dc2626)",
        color: "white",
        padding: "14px 22px",
        borderRadius: "14px",
        fontFamily: "'DM Sans', sans-serif",
        fontWeight: "600",
        fontSize: "0.9rem",
        boxShadow: "0 12px 32px rgba(0,0,0,0.4)",
        zIndex: "9999",
        animation: "fadeInUp 0.3s ease",
        maxWidth: "320px"
    });
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// ─── Cartoon Click Interaction ─────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
    const cartoon = document.getElementById("cartoon");
    const messages = [
        "Saving money is fun! 💰",
        "Track every rupee! 📊",
        "Cancel what you don't use! ✂️",
        "Annual plans save more! 🗓️",
        "You're doing great! 🌟"
    ];
    let msgIndex = 0;

    if (cartoon) {
        cartoon.addEventListener("click", () => {
            const bubble = cartoon.querySelector(".speech-bubble text:last-child");
            if (bubble) {
                bubble.textContent = messages[msgIndex % messages.length];
                msgIndex++;
            }
        });
    }
});
