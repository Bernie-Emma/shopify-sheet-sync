import React, { useState } from "react";
import { createClient } from "@supabase/supabase-js";
import "./App.css";

const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
	throw new Error(
		"Supabase URL or Anon key is not defined in environment variable"
	);
}

type Item = {
	title: string;
	sku: string;
	quantity: number;
};

function App() {
	const [message, setMessage] = useState<string>("");
	const [items, setItems] = useState<Item[]>([]);
	const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
	// Placeholder functions
	const importXml = async (
		fileName: string,
		fileContent: ArrayBuffer | string
	) => {
		// validate input file is xml
		if (!fileContent) {
			return "please input a valid xml file";
		}
		// handle file upload (returns name of file)
		const { data: uploadData, error: uploadError } = await supabase.storage
			.from("products-xml")
			.upload(`imports/${fileName}`, fileContent, {
				cacheControl: "3600",
				upsert: true,
			});

		if (uploadError) {
			console.log("Error in upload: ", uploadError);
			return;
		}
		// Make request to edge function
		const { data, error } = await supabase.functions.invoke(
			"import-from-xml",
			{
				body: { fileName: fileName },
			}
		);
		if (error) {
			console.log(error);
			alert("An error occured while importing from the xml file");
		}
		// return details about success of the import
		// call the function to update the table
		console.log(uploadData);
		setMessage(data.message);
	};
	const exportXml = async () => {
		const { data, error } = await supabase.functions.invoke(
			"export-to-xml",
			{
				body: { name: "function" },
			}
		);
		if (error) {
			console.log("Xml data could not be exported");
		} else {
			const { fullPath } = JSON.parse(data);
			setMessage(
				`Download url: ${SUPABASE_URL}/storage/v1/object/public/${fullPath}`
			);
			const { data: downloadData, error } = await supabase.storage
				.from("products-xml")
				.download("exports/7-28-2025.txt");
			if (error) {
				console.log(error);
			} else {
				const blob = new Blob([downloadData], {
					type: "application/xml",
				});
				const url = URL.createObjectURL(blob);

				const a = document.createElement("a");
				a.href = url;
				a.download = "exported-products.txt";
				document.body.appendChild(a);
				a.click();
				document.body.removeChild(a);

				URL.revokeObjectURL(url);
			}
			// return a card object that allows client to view or download the necessary xml data
		}
	};
	const pullShopify = async () => {
		const { data, error } = await supabase.functions.invoke(
			"pull-from-shopify",
			{
				body: { name: "function" },
			}
		);
		if (error) {
			console.log("An error occured while pulling from shopify");
		} else {
			setMessage(data.importResults.message); // display the message
			setItems(data.importResults.data); // display the data on the table
		}
	};
	// const pushShopify = () => {
	// 	alert("Push Shopify clicked");
	// };

	// const loadSupabase = async () => {
	// 	console.log("Supabase data updated")
	// 	// function to load all the products from supabase and update the table
	// }

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		// Handle file upload logic here
		if (e.target.files?.length) {
			const file = e.target.files[0];
			const fileName = file.name;
			const confirmed = confirm(
				"Confirm upload of '" +
					fileName +
					"' doing this will start the import"
			);

			if (confirmed) {
				const reader = new FileReader();
				reader.onload = (event) => {
					const fileContent = event.target?.result;
					if (!fileContent) return "error don sup";
					importXml(fileName, fileContent);
				};
				reader.onerror = (error) => {
					console.error("Error reading file: ", error);
				};
				reader.readAsArrayBuffer(file);
			}
		}
	};

	return (
		<div className="app-container">
			<div className="main-card">
				<h2 className="page-title">
					Shopify Product Synchronization Dashboard
				</h2>
				{/* This should become a more complex logger */}
				<div className="message-box info">
					<p>
						{message ||
							"Click any of the buttons to start synchronization"}
					</p>
				</div>
				<div className="file-upload-area" id="drag-drop-area">
					<input
						type="file"
						accept=".txt, .xml"
						id="file-upload-input"
						onChange={handleFileChange}
					/>
					<div className="file-upload-content">
						<p className="file-upload-text">
							Drag & Drop your XML/TXT file here or{" "}
							<span className="browse-link">Browse</span>
						</p>
						<small>
							Adding a file will automatically start the import
						</small>
						<p
							id="selected-file-name"
							className="selected-file-name"
						></p>
					</div>
				</div>

				<div className="button-grid">
					<button
						id="import-xml-btn"
						className="action-button blue-button"
						// onClick={importXml}
						disabled
					>
						<span className="button-content">Import XML</span>
						<span className="spinner hidden"></span>
					</button>
					<button
						id="export-xml-btn"
						className="action-button green-button"
						onClick={exportXml}
					>
						<span className="button-content">Export XML</span>
						<span className="spinner hidden"></span>
					</button>
					<button
						id="pull-shopify-btn"
						className="action-button purple-button"
						onClick={pullShopify}
					>
						<span className="button-content">
							Pull from Shopify
						</span>
						<span className="spinner hidden"></span>
					</button>
					<button
						id="push-shopify-btn"
						className="action-button red-button"
						onClick={pullShopify}
						disabled
					>
						<span className="button-content">Push to Shopify</span>
						<span className="spinner hidden"></span>
					</button>
				</div>

				<div className="table-container">
					{/* Also display some additional data, like number of items or last updated time */}
					<table className="item-table">
						<thead>
							<tr>
								<th>Title</th>
								<th>SKU</th>
								<th>Quantity</th>
							</tr>
						</thead>
						<tbody>
							{items ? (
								items.map((item, idx) => (
									<tr key={idx}>
										<td>{item.title}</td>
										<td>{item.sku}</td>
										<td>{item.quantity}</td>
									</tr>
								))
							) : (
								<tr className="empty-state-row">
									<td colSpan={3}>No items to display</td>
								</tr>
							)}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	);
}

export default App;
