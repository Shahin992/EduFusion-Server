# 🚀 Enterprise Bulk Student Import Guide (BullMQ + Redis)

This guide outlines the architecture and implementation details for the bulk student import system.

---

## 🛠️ Backend Implementation (What's Already Built)

The backend is now equipped with an asynchronous queue system using **BullMQ** and **Redis**.

### 1. Endpoints
*   **`POST /api/import/students`**: 
    *   **Input**: JSON array of students, a field mapping object, and class/session IDs.
    *   **Action**: Creates a job in Redis and returns a `jobId` immediately.
    *   **Max Payload**: Increased to **50MB** to support huge JSON arrays.
*   **`GET /api/import/status/:jobId`**: 
    *   **Output**: Current progress (`processedRows`, `successCount`, `failedCount`) and an `errors` array.

### 2. Processing Logic (`ImportProcessor`)
*   **Background Execution**: Runs in a separate worker process so it doesn't block the main thread.
*   **Field Mapping**: Dynamically maps CSV columns to system fields (`name`, `rollNumber`, etc.).
*   **Smart Defaults**: Handles automatic roll number and registration number generation.
*   **Account Creation**: Automatically creates student user accounts during import.

### 3. Database Schema (`ImportJob`)
*   Tracks `status` (`PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`).
*   Stores the list of `errors` with row numbers and reasons.

---

## 🎨 Frontend Implementation (What You Need to Build)

To provide a premium user experience, follow this flow in your frontend:

### 1. Select & Parse
*   **UI**: A modal with a stepper.
*   **Action**: Use a library like `PapaParse` to parse the CSV file locally in the browser.
*   **Output**: A JSON array of all rows.

### 2. Mapping UI
*   **UI**: A table showing your system fields (e.g., *Student Name*) and a dropdown to select which CSV column matches it (e.g., *Full Name*).
*   **Logic**: Pre-select matches if the names are similar.

### 3. Initiation
*   **Action**: Send the JSON data and mapping to `POST /api/import/students`.
*   **Storage**: Save the returned `jobId` in your state.

### 4. Progress Tracking (Polling)
*   **Action**: Call `GET /api/import/status/:jobId` every 2-3 seconds.
*   **UI Logic**:
    *   **Total Progress**: Display a progress bar using `(processedRows / totalRows) * 100`.
    *   **Individual Statuses**:
        *   If `index + 2 <= processedRows` AND index is NOT in `errors` → **✅ Success**.
        *   If `index + 2` is in `errors` → **❌ Failed** (show the reason from the error object).
        *   Otherwise → **⏳ Pending**.

---

## ⚙️ Required Infrastructure Change (Railway)

To make this work in production, you **MUST** do the following in Railway:

1.  **Add Redis**: Add a Redis service to your project.
2.  **Auto-Config**: My code is already set up to detect Railway's `REDISHOST`, `REDISPORT`, and `REDISPASSWORD` variables automatically.

---

## 📋 Example Status Mapping Logic (JavaScript)

```javascript
const getStudentStatus = (index, importStatus) => {
  const rowNumber = index + 2; // CSV rows start at 2 (1 is header)
  
  const error = importStatus.errors.find(e => e.row === rowNumber);
  if (error) return { status: 'FAILED', reason: error.reason };
  
  if (rowNumber <= importStatus.processedRows) {
    return { status: 'SUCCESS' };
  }
  
  return { status: 'PENDING' };
};
```
