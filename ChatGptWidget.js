(function () {
  const template = document.createElement("template");
  template.innerHTML = `
    <style>
      body { font-family: Arial, sans-serif; background-color: #f3f4f6; color: #333; }
      div { margin: 50px auto; max-width: 600px; padding: 20px; background-color: #fff; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); border-radius: 8px; }
      .input-container { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
      #prompt-input { flex-grow: 1; padding: 12px; font-size: 16px; border: 1px solid #ddd; border-radius: 5px; margin-right: 10px; transition: box-shadow 0.3s; }
      #prompt-input:focus { outline: none; box-shadow: 0 0 5px rgba(0, 123, 255, 0.5); border-color: #007bff; }
      #attachment-button { padding: 12px; font-size: 16px; background-color: #f8f9fa; border: 1px solid #ddd; border-radius: 5px; cursor: pointer; margin-right: 10px; transition: background-color 0.3s; }
      #attachment-button:hover { background-color: #e9ecef; }
      #file-input { display: none; }
      #generate-button { padding: 12px 20px; font-size: 16px; background-color: #007bff; color: #fff; border: none; border-radius: 5px; cursor: pointer; transition: background-color 0.3s; }
      #generate-button:hover { background-color: #0056b3; }
      #response-container { max-height: 400px; overflow: auto; padding: 10px; border: 1px solid #ddd; border-radius: 5px; background-color: #f9f9f9; resize: both; }
      canvas { max-width: 100%; }
      .file-info { display: flex; align-items: center; gap: 10px; margin-top: 10px; font-size: 14px; color: #555; }
      .file-name { font-size: 14px; color: #333; }
      .delete-icon { font-size: 18px; color: red; cursor: pointer; display: none; transition: transform 0.2s; }
      .delete-icon:hover { transform: scale(1.2); }
    </style>
    <div>
      <center>
        <img src="https://1000logos.net/wp-content/uploads/2023/02/ChatGPT-Logo.jpg" width="150" style="margin-bottom: 20px;" />
        <h1>ChatGPT Assistant</h1>
      </center>
      <div class="input-container">
        <label for="file-input" id="attachment-button">📎</label>
        <input type="file" id="file-input" accept=".csv" />
        <input type="text" id="prompt-input" placeholder="Enter your message...">
        <button id="generate-button">Search</button>
      </div>
      <div class="file-info">
        <div id="file-name" class="file-name"></div>
        <span id="delete-icon" class="delete-icon">❌</span>
      </div>
      <div id="response-container"></div>
    </div>
  `;

  class Widget extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: "open" }).appendChild(template.content.cloneNode(true));
      this._props = {};
    }

    connectedCallback() {
      this.initMain();
    }

    async initMain() {
      const responseContainer = this.shadowRoot.getElementById("response-container");
      const fileInput = this.shadowRoot.getElementById("file-input");
      const fileNameDisplay = this.shadowRoot.getElementById("file-name");
      const deleteIcon = this.shadowRoot.getElementById("delete-icon");
      let csvSummary = "";
      const { apiKey } = this._props;

      // Event listener for file upload
      fileInput.addEventListener("change", async (event) => {
        const file = event.target.files[0];
        if (file && file.type === "text/csv") {
          csvSummary = await this.getCsvPlainText(await file.text());
          fileNameDisplay.textContent = `Uploaded: ${file.name}`;
          deleteIcon.style.display = "inline"; // Show the delete icon
        } else {
          alert("Please upload a valid CSV file.");
        }
      });

      // Handle delete icon click
      deleteIcon.addEventListener("click", () => {
        fileInput.value = ""; // Reset file input
        fileNameDisplay.textContent = ""; // Clear file name display
        deleteIcon.style.display = "none"; // Hide delete icon
        csvSummary = ""; // Clear CSV summary
      });

      // Event listener for generate button
      this.shadowRoot.getElementById("generate-button").addEventListener("click", async () => {
        console.log(apiKey);
        const prompt = this.shadowRoot.getElementById("prompt-input").value;
        responseContainer.innerHTML = `<p>Loading...</p>`;
        const completePrompt = csvSummary ? `${prompt}\n\nKey CSV Data:\n${csvSummary}` : prompt;

        try {
          const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model: "gpt-3.5-turbo",
              messages: [
                { role: "system", content: "You are a helpful assistant." },
                { role: "user", content: completePrompt },
              ],
              max_tokens: 1024,
              temperature: 0.5,
            }),
          });

          if (response.ok) {
            const { choices } = await response.json();
            const result = choices[0].message.content.trim();

            responseContainer.innerHTML = "";

            try {
              const parsedData = JSON.parse(result);
              if (Array.isArray(parsedData.data)) {
                this.renderChart(responseContainer, parsedData);
              } else {
                this.renderText(responseContainer, result);
              }
            } catch (e) {
              this.renderText(responseContainer, result);
            }
          } else {
            const error = await response.json();
            alert("OpenAI Response: " + error.error.message);
            responseContainer.innerHTML = "";
          }
        } catch (err) {
          alert("An error occurred: " + err.message);
          responseContainer.innerHTML = "";
        }
      });
    }

    renderChart(container, data) {
      const canvas = document.createElement("canvas");
      container.appendChild(canvas);

      // Create a chart using Chart.js
      new Chart(canvas, {
        type: "bar",
        data: {
          labels: data.labels, // Array of labels
          datasets: [
            {
              label: data.title || "Dataset",
              data: data.data, // Array of data points
              backgroundColor: "rgba(75, 192, 192, 0.2)",
              borderColor: "rgba(75, 192, 192, 1)",
              borderWidth: 1,
            },
          ],
        },
        options: {
          responsive: true,
          plugins: {
            legend: {
              position: "top",
            },
            title: {
              display: true,
              text: data.title || "Generated Chart",
            },
          },
        },
      });
    }

    renderText(container, text) {
      // Pastikan container memiliki overflow untuk mendukung scroll
      container.style.maxHeight = "400px"; // Batas tinggi container
      container.style.overflow = "auto"; // Scroll jika konten melampaui batas
    
      const textArea = document.createElement("textarea");
      textArea.style.width = "100%"; // Menyesuaikan lebar ke 100% dari container
      textArea.style.boxSizing = "border-box"; // Pastikan padding tidak menambah lebar total
      textArea.style.padding = "10px"; // Tambahkan padding untuk kenyamanan
      textArea.style.border = "1px solid #ccc"; // Berikan gaya border
      textArea.style.borderRadius = "5px"; // Tambahkan border radius untuk estetika
      textArea.style.fontSize = "16px"; // Ukuran font agar selaras dengan input lainnya
      textArea.style.overflow = "auto"; // Menambahkan scroll otomatis jika teks melebihi area
      textArea.rows = "1000"; // Tentukan jumlah baris default
      textArea.cols = "1000";
      textArea.style.resize="both";
      textArea.readOnly = false;
      textArea.value = text;
      container.appendChild(textArea);
    }

    async getCsvPlainText(csvText) {
      const rows = csvText.split("\n").filter((row) => row.trim() !== "");
      if (rows.length === 0) return "No data found in the CSV.";

      const headers = rows[0].split(",");
      const dataRows = rows.slice(1);

      let summary = `Headers: ${headers.join(", ")}\n`;

      dataRows.forEach((row, index) => {
        const cells = row.split(",");
        summary += `Row ${index + 1}: ${cells.join(", ")}\n`;
      });

      return summary.trim();
    }

    onCustomWidgetBeforeUpdate(changedProperties) {
      this._props = { ...this._props, ...changedProperties };
    }

    onCustomWidgetAfterUpdate() {
      this.initMain();
    }

  }

  customElements.define("com-sap-chatgptwidget", Widget);
})();
