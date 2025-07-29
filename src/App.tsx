import React, { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import "./App.css";

const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
	throw new Error(
		"Supabase URL or Anon key is not defined in environment variable"
	);
}

type Item = {
	title: string;
	sku: string;
	inventoryQuantity: number;
	shopify_id: string;
};

function App() {
	const [message, setMessage] = useState<string>(
		"Connection to database established"
	);
	const [progress, setProgress] = useState<number>(100);
	const [fileName, setFileName] = useState<string>("");
	const [fileContent, setFileContent] = useState<ArrayBuffer | string>("");
	const [fileUpload, setFileUpload] = useState<boolean>(false);
	const [items, setItems] = useState<Item[]>([]);
	const [currentPage, setCurrentPage] = useState(1);
	const itemsPerPage = 10;
	const totalPages = Math.ceil(items.length / itemsPerPage);
	const indexOfLastItem = currentPage * itemsPerPage;
	const indexOfFirstItem = indexOfLastItem - itemsPerPage;
	const currentItems = items.slice(indexOfFirstItem, indexOfLastItem);

	useEffect(() => {
		const fetchProducts = async () => {
			const { data: supabaseProducts, error } = await supabase
				.from("products")
				.select("title,sku,inventoryQuantity,shopify_id");
			if (error) {
				console.error("Error fetching data: ", error);
			} else {
				setItems(supabaseProducts);
			}
		};

		fetchProducts();
	}, [message]);
	const uploadFile = async () => {
		if (!fileContent) {
			return "please input a valid xml file";
		}
		setProgress(0);
		const intervalId = setInterval(() => {
			setProgress((curr) => {
				const increment = Math.floor(Math.random() * 20);
				const next = curr + increment;
				return next > 95 ? 95 : next;
			});
		}, 200);
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
		setMessage(`File upload successful: ${uploadData.path.split("/")[1]}`);
		setFileUpload(true);
		clearInterval(intervalId);
		setProgress(100);
	};
	const synchronization = async () => {
		setProgress(0);
		const intervalId = setInterval(() => {
			setProgress((curr) => {
				const increment = Math.floor(Math.random() * 20) * 0.2;
				const next = curr + increment;
				return next > 95 ? 95 : next;
			});
		}, 200);
		setTimeout(() => {
			clearInterval(intervalId);
			setProgress(100);
			setMessage("Synchronization process completed");
		}, 20000);
		await pullShopify();
		await importXml();
		await pushShopify();
		await exportXml();
		clearInterval(intervalId);
		setProgress(100);
	};
	// Placeholder functions
	const importXml = async () => {
		// Make request to edge function
		if (!fileName) {
			console.log("There has to be a file to continue");
			return;
		}
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
		}
	};
	const pushShopify = () => {
		alert("Push Shopify clicked");
	};

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		// Handle file upload logic here
		if (e.target.files?.length) {
			const file = e.target.files[0];
			const fileExtension = file.name.split(".").pop()?.toLowerCase();
			const confirmation = window.confirm(
				`Confirm upload of ${file.name}`
			);

			if (fileExtension !== "txt") {
				alert(`File "${file.name} is not a .txt file.`);
				return;
			}

			if (!confirmation) {
				console.log("File upload cancelled by user");
				return;
			}
			const reader = new FileReader();
			reader.onprogress = (event) => {
				if (event.lengthComputable) {
					const percent = Math.round(
						(event.loaded / event.total) * 100
					);
					setProgress(percent);
				}
			};
			reader.onloadend = (event) => {
				const fileContent = event.target?.result;
				if (!fileContent) throw new Error("error don sup");
				setFileName(file.name);
				setFileContent(fileContent);
			};
			reader.onerror = (error) => {
				console.error("Error reading file: ", error);
			};
			reader.readAsArrayBuffer(file);
		}
	};

	return (
		<div className="app-container">
			<div className="main-card">
				<h2 className="page-title">
					Shopify Product Synchronization tool
				</h2>
				<div className="message-box">
					{/* This is going to be an important tool for status updates */}
					{progress < 100 ? (
						<span className="spinner"></span>
					) : (
						<p className="message">{message}</p>
					)}

					<div
						className="progress-bar"
						style={{ width: `${progress}%` }}
					></div>
				</div>

				<div className="file-upload-area">
					<input
						type="file"
						accept=".txt"
						id="file-upload-input"
						onChange={handleFileChange}
					/>
					<div className="file-upload-content">
						<p className="file-upload-text">
							Drag & Drop your XML/TXT file here or{" "}
							<span className="browse-link">Browse</span>
						</p>
						<p className="selected-file-name">
							File:{" "}
							<span className="browse-link">
								{fileContent ? fileName : ""}
							</span>
						</p>
					</div>
				</div>

				<div className="button-grid">
					<button
						className="action-button green-button"
						onClick={uploadFile}
						disabled={fileContent == ""}
					>
						<span className="button-content">Upload file</span>
					</button>
					<button
						className="action-button blue-button"
						onClick={synchronization}
						disabled={fileContent == "" || !fileUpload}
					>
						<span className="button-content">Synchronize</span>
					</button>
					<button
						className="action-button blue-button"
						onClick={importXml}
					>
						<span className="button-content">Import XML</span>
					</button>
					<button
						id="export-xml-btn"
						className="action-button green-button"
						onClick={exportXml}
					>
						<span className="button-content">Export XML</span>
					</button>
					<button
						id="pull-shopify-btn"
						className="action-button purple-button"
						onClick={pullShopify}
					>
						<span className="button-content">
							Pull from Shopify
						</span>
					</button>
					<button
						id="push-shopify-btn"
						className="action-button red-button"
						onClick={pullShopify}
						disabled
					>
						<span className="button-content">Push to Shopify</span>
					</button>
				</div>

				<div className="table-container">
					<div className="table-controls">
						<p>Total Products: {items.length}</p>
						<button
							onClick={() =>
								setCurrentPage((p) => Math.max(p - 1, 1))
							}
							disabled={currentPage === 1}
						>
							Previous
						</button>
						<span>
							Page {currentPage} of {totalPages}
						</span>
						<button
							onClick={() =>
								setCurrentPage((p) =>
									p < totalPages ? p + 1 : p
								)
							}
							disabled={currentPage === totalPages}
						>
							Next
						</button>
					</div>
					<table className="item-table">
						<thead>
							<tr>
								<th>Title</th>
								<th>SKU</th>
								<th>Quantity</th>
								<th>Source</th>
							</tr>
						</thead>
						<tbody>
							{currentItems.length > 0 ? (
								currentItems.map((item, idx) => (
									<tr key={idx}>
										<td>{item.title}</td>
										<td>{item.sku}</td>
										<td>{item.inventoryQuantity}</td>
										<td>
											{item.shopify_id
												? "Shopify"
												: "XML"}
										</td>
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
