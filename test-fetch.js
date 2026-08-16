async function test() {
  try {
    const res = await fetch("http://localhost:3000/api/debug");
    const text = await res.text();
    console.log("Response:", text);
  } catch(e) {
    console.log("Error:", e);
  }
}
test();
