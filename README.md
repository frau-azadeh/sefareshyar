<div align="center">

# 📦 Sefareshyar


**Every order. A clear status. A next step.**

A lightweight order management app for home-based Instagram sellers.

![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
![RTL](https://img.shields.io/badge/Persian-RTL-0F766E?style=for-the-badge)
![MVP](https://img.shields.io/badge/Status-MVP-F59E0B?style=for-the-badge)

Built for the **Diginext AI Solo Founder Camp — Root Cause Challenge**

[Overview](#-overview) ·
[Features](#-features) ·
[Getting Started](#-getting-started) ·
[Demo](#-demo-walkthrough) ·
[Limitations](#-current-limitations)

</div>

---

## 💡 Overview

Home-based sellers often manage production, sales, payments, shipping, and customer support on their own.

When order information lives across Instagram DMs, screenshots, notebooks, and memory, keeping track of every commitment becomes difficult.

**Sefareshyar brings order details, payment confirmation, shipping deadlines, and next actions into one Persian workspace.**

The MVP focuses on one question:

> What does this order need next?

## 🔎 The Problem

The challenge research pack suggests that fragmented order records are a recurring operational problem.

| Research finding | Evidence |
| :--- | :--- |
| **65.5%** reported a forgotten or lost order during the previous three months. | 131 of 200 survey respondents |
| **46.5%** record orders only in DMs, screenshots, or memory. | 93 of 200 survey respondents |
| **3.5 hours per day** was the median estimated messaging time. | Self-reported survey responses |
| Sellers acknowledged overlooking customer messages. | Conversations `C001` and `C021` |

**Sources:** `02_survey.xlsx` and `03_direct_messages.xlsx` from the supplied research pack. Interviews 01, 22, and 25 also describe fragmented records and uncertainty about open orders.

Messaging time includes activities beyond order tracking. These findings support a working diagnosis within the sample; they do not establish causation, market-wide prevalence, or willingness to pay.

## 🎯 Who Is It For?

The initial audience is a seller who:

- 👤 Operates alone or with occasional family help.
- 🕯️ Sells products with relatively stable specifications.
- 💬 Receives orders through Instagram conversations.
- 🧾 Manually checks payments and shipping details.
- 📋 Needs a clear view of open orders and pending actions.

Candles, soap, and similar products provide a manageable starting point. Complex custom-production workflows are outside the first version’s scope.

## ✨ Features

| | Feature | Description |
| :---: | :--- | :--- |
| 📦 | **Order management** | Create, edit, and delete orders. |
| 👤 | **Customer details** | Record customer names, Instagram handles, and addresses. |
| 🏷️ | **Product specifications** | Keep agreed product details, quantities, and amounts together. |
| 💳 | **Payment confirmation** | Manually record that the seller has checked the payment. |
| 📅 | **Persian calendar** | Select shipping deadlines using a Persian date picker. |
| ⏰ | **Deadline visibility** | Identify orders due today and overdue open orders. |
| 🧩 | **Missing information** | Highlight missing customer handles or shipping addresses. |
| ➡️ | **Next-action guidance** | Show the next task for each order. |
| 🔍 | **Search and filters** | Find orders by customer, product, handle, status, or tracking code. |
| 🚚 | **Shipping references** | Save tracking codes alongside orders. |
| 💬 | **Customer messages** | Preview, edit, and copy status-based message templates. |
| 🔔 | **Confirmation toasts** | Confirm important actions inside the application. |
| 💾 | **Local persistence** | Keep orders after refreshing the same browser. |
| 📤 | **JSON backup** | Export orders and import a validated backup. |
| 🧪 | **Sample data** | Explore the workflow with five fictional orders. |
| 📱 | **Responsive interface** | Use the workspace on mobile and desktop. |

## 🔄 Order Workflow

| Status | Purpose |
| :--- | :--- |
| 🧩 **Incomplete details** | Collect missing customer information. |
| 💳 **Awaiting payment** | Check and confirm the transfer. |
| 🛠️ **In preparation** | Prepare the agreed product. |
| 📦 **Ready to ship** | Arrange the package handoff. |
| 🚚 **Shipped** | Record shipment and share tracking information. |
| 🚫 **Cancelled** | Close the order and coordinate any payment follow-up. |

Preparation and shipping stages require complete address and handle fields, plus manually confirmed payment.

**Payment and shipment are confirmed by the seller—not verified through external services.**

## 🛠️ Technology Stack

| Layer | Technology |
| :--- | :--- |
| ⚡ Framework | Next.js 16 — App Router |
| 🔷 Language | TypeScript |
| ⚛️ Interface | React |
| 🎨 Styling | Tailwind CSS |
| 🔤 Typography | Vazirmatn |
| 🗓️ Calendar | `react-multi-date-picker`, `react-date-object` |
| 💾 Persistence | Browser `localStorage` |
| 📁 Data portability | JSON export and import |

## 🚀 Getting Started

### Requirements

- Node.js **20.9 or later**
- npm

### Install dependencies

From the directory containing `package.json`:

```bash
npm install
```

If the calendar dependencies are not yet included:

```bash
npm install react-multi-date-picker react-date-object
```

### Start development

```bash
npm run dev
```

Open **http://localhost:3000**, or the address printed in the terminal.

No API keys or database credentials are required.

An internet connection is needed for package installation and the initial Google font download.

### Check the project

```bash
npx tsc --noEmit
npx eslint .
npm run build
```

### Start the production build

After a successful build:

```bash
npm run start
```

These commands describe verification steps; they do not imply a completed automated test suite or passing CI pipeline.

## 🗂️ Project Structure

```text
src/
└── app/
    ├── layout.tsx       # Persian language, RTL, font, and metadata
    ├── globals.css      # Shared styles and calendar appearance
    ├── page.tsx         # Orders, forms, storage, messages, and toasts
    └── icon.png         # Optional application icon

public/
package.json
README.md
```

Projects created without a `src` directory use `app/` directly.

## 🎬 Demo Walkthrough

1. 🧪 Load the fictional sample orders from the empty state.
2. ⏰ Open the overdue filter to identify urgent work.
3. ➕ Create an order without a shipping address.
4. 🧩 Inspect the missing-information warning.
5. ✏️ Complete the details and manually confirm payment.
6. 📦 Move the order through preparation and ready-to-ship stages.
7. 🚚 Add a fictional tracking code and confirm shipment.
8. 💬 Preview and copy the customer message.
9. 🔄 Refresh the page to check persistence.
10. 📤 Export a backup and inspect the confirmation before importing it.

Use fictional customer details in public demonstrations.

## 💾 Storage and Data Handling

> Orders are stored in the current browser, not in a cloud account.

- **Storage key:** `sefareshyar.orders.v1`
- **Date storage:** Gregorian `YYYY-MM-DD` strings.
- **Date interface:** Persian calendar and Persian date display.
- **Backup format:** JSON.
- **Import behavior:** Replaces the current order list after confirmation.
- **Recovery behavior:** Unreadable saved data blocks writes to avoid silent overwriting.

Orders do not synchronize between devices, browsers, or domains.

Clearing browser data can remove the order book. Export backups regularly and protect files containing customer information.

## 🤖 Role of AI

AI assisted with research interpretation, drafting, and implementation.

The current application:

- Uses **rule-based customer message templates**.
- Does **not** call an AI model.
- Does **not** automatically extract orders from Instagram conversations.

A possible future experiment is extracting draft order fields from seller-selected text, with missing or contradictory details flagged for human review.

Evidence verification, problem selection, pilot observation, payment confirmation, and shipment decisions remain human responsibilities.

## 📊 Validation Plan

The MVP demonstrates the proposed workflow. Its effectiveness with real sellers has not yet been established.

The planned pilot measures **administrative time per confirmed order**, including entry, searching, status checks, and follow-up responses.

| Metric | Proposed initial target |
| :--- | :--- |
| ⏱️ Administrative time | At least 30% less time per order for at least three of five pilot sellers |
| 🔁 Continued use | At least four of five sellers use the tool during the final three pilot days |
| ✍️ Independent adoption | Those sellers independently record at least 80% of new confirmed orders |
| ✅ Reliability | Time savings do not coincide with more forgotten or incorrectly fulfilled orders |

**These are proposed targets, not observed results.**

Assisted entries should be reported separately. Longer follow-up is needed to evaluate fulfillment outcomes and willingness to pay.

## ⚠️ Current Limitations

- No authentication or user accounts.
- No cloud database or cross-device synchronization.
- No Instagram integration or automatic DM import.
- No automatic payment or shipment verification.
- No automatic customer messaging.
- No accounting or profitability calculations.
- No AI extraction.
- Clipboard access can depend on browser permissions and connection security; messages remain available for manual copying.

This is a competition MVP, not a validated production service.

## ✅ Submission Checklist

- [ ] Verify continuous typing inside the order modal.
- [ ] Create and edit an order.
- [ ] Check Persian calendar selection and date persistence.
- [ ] Refresh and verify saved records.
- [ ] Check today and overdue filters.
- [ ] Test missing-information and payment restrictions.
- [ ] Cancel and confirm toast actions.
- [ ] Review customer messages and tracking codes.
- [ ] Export and import a valid backup.
- [ ] Confirm invalid backup files are rejected.
- [ ] Check the interface on mobile.
- [ ] Run TypeScript, ESLint, and the production build.
- [ ] Publish and verify the public demo in a fresh browser session.
- [ ] Add the verified URL to `mvp-link.txt`.

For the competition submission, include `mvp-link.txt` alongside the required `report.pdf` in the submission ZIP.

A localhost or private network address is not a public demo link.

---

<div align="center">

### 📦 Less searching. Clearer orders.

**Sefareshyar .**

Built for home-based sellers who do it all.

</div>