---
name: kesher-api
description: Guidelines and best practices for integrating with the Kesher Payment API (SendTransaction and GetLinkToken). Use this skill when modifying payment processing logic or debugging Kesher integrations.
---

# Kesher API Integration Guidelines

When working with the Kesher API (ConnectToKesher) in this project, adhere to the following critical rules and behaviors:

## 1. Handling Success Responses and Warnings
Kesher's API can return a successful clearing status while simultaneously returning an internal error description regarding receipt generation (e.g., when the `ProjectNumber` is invalid or `000`).
- **Code 499**: This code means the payment cleared successfully in the credit card company, but there was a warning/error generating the receipt.
- **Rule**: If `result.RequestResult.Status === true` or `result.RequestResult.Code === 499` (or `0`), treat the transaction as **SUCCESSFUL**. Do NOT expose Kesher's `Description` (which might contain "נתונים לא נכונים") to the end user. Always override the message with a clean success message like `"התשלום עבר בהצלחה"` so the user isn't confused.

## 2. Extracting the Receipt URL (PDF)
Kesher does NOT return the receipt URL in a top-level `DocUrl` field. Instead, it is nested deeply in the response object.
- **Rule**: Always extract the receipt URL using this exact fallback logic:
  ```typescript
  const receiptUrl = result?.DocumentsDetails?.DocumentDetails?.[0]?.PdfLink || 
                     result?.DocumentsDetails?.DocumentDetails?.[0]?.PdfLinkCopy || 
                     result?.CompanyTranId || 
                     result?.NumTransaction || 
                     "";
  ```
  This `receiptUrl` must be saved in the CRM contact card under `receiptLink` to allow viewing the PDF later.

## 3. Extracting the Transaction ID
- The ID from the clearing company is found at `result.CompanyTranId` or `result.NumTransaction`. 

## 4. Payment Types and Frequencies
Kesher uses `CreditType` to determine the nature of the transaction. Follow these exact mappings:
- **One-time payment**: `CreditType: 1`
- **Installments (תשלומים)**: `CreditType: 8`. Note: For installments, `NumPayment` must be set to `totalInstallments - 1`.
- **Recurring Payment / Standing Order (הוראת קבע)**: `CreditType: 10`. Note: Set `NumPayment` to the amount of months (e.g. `12`) or `9999` for unlimited.

## 5. Expiry Date Formatting
Kesher strictly expects the credit card expiration date in **YYMM** format (e.g., `2612` for December 2026). If the input is in `MMYY`, you must swap the segments before sending the payload.

## 6. Project Numbers
If no specific receipt/project type is defined, `ProjectNumber` should be set to `"000"`. It acts as the default project in the Kesher CRM, and while it may trigger a warning (Code 499), it effectively saves the record under the root project.
