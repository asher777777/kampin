import fetch from "node-fetch";

const testToken = async () => {
  const payload = {
    Json: {
      userName: "2180005WS9914",
      password: "SkYxnQyhzRM36uccztNYc5aQRR2ZmliFS0OBGQItfTf0yslqTR",
      func: "GetLinkToken",
      format: "json",
      request: {
        PaymentPageId: "000",
        Currency: "1", // ILS
        Total: "10",
        Name: "Test Name",
        FirstName: "Test",
        LastName: "Name",
        Tel: "0500000000",
        Mail: "test@example.com",
        CreditType: "1",
        Date: new Date().toISOString().split("T")[0],
        Comment: "תשלום בדיקה",
        AddData: "TXN_12345",
        NumPayment: "1",
        MaxPayments: "1",
        Moked: "CommunityGenerator"
      }
    },
    format: "json"
  };

  console.log("Sending payload:", JSON.stringify(payload, null, 2));

  try {
    const res = await fetch("https://kesherhk.info/ConnectToKesher/ConnectToKesher", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const text = await res.text();
    console.log("Response:", text);
  } catch (err) {
    console.error("Error:", err);
  }
};

testToken();
