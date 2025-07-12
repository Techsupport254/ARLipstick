"use client";
import { Table } from "antd";
import "antd/dist/reset.css";
import { FaCreditCard } from "react-icons/fa";
import { useEffect, useState } from "react";
import { getAuth } from "firebase/auth";
import Image from "next/image";

interface PaymentItem {
	paymentId: string;
	userId: string;
	createdAt: string;
	amount: number;
	status: string;
	transactionRef?: string;
	subtotal?: number;
	vat?: number;
	deliveryFee?: number;
	phoneNumber?: string;
	deliveryLocation?: string;
	paystackRef?: string;
}

export default function AdminPaymentsPage() {
	const [data, setData] = useState<PaymentItem[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [users, setUsers] = useState<
		Record<string, { displayName?: string; email?: string; photoURL?: string }>
	>({});

	const columns = [
		{
			title: "Payment #",
			dataIndex: "paymentId",
			key: "paymentId",
		},
		{
			title: "User",
			dataIndex: "userId",
			key: "userId",
			render: (userId: string) => {
				const user = users[userId];
				if (!user) return "-";
				return (
					<span className="flex items-center gap-3">
						<Image
							src={user.photoURL || "/ar-lipstick-logo.svg"}
							alt={user.displayName || user.email || "User"}
							width={32}
							height={32}
							className="rounded-full border border-pink-200 bg-white"
						/>
						<span>
							<span className="font-semibold text-black block">
								{user.displayName || "(No Name)"}
							</span>
							<span className="text-xs text-gray-500">{user.email || "-"}</span>
						</span>
					</span>
				);
			},
		},
		{
			title: "Date",
			dataIndex: "createdAt",
			key: "createdAt",
			render: (value: string) => {
				if (!value) return "-";
				const date = new Date(value);
				const day = date.getDate();
				const month = date.toLocaleString("default", { month: "long" });
				const year = date.getFullYear();
				// Get ordinal suffix
				const j = day % 10,
					k = day % 100;
				let suffix = "th";
				if (j === 1 && k !== 11) suffix = "st";
				else if (j === 2 && k !== 12) suffix = "nd";
				else if (j === 3 && k !== 13) suffix = "rd";
				return `${day}${suffix} ${month}, ${year}`;
			},
		},
		{
			title: "Subtotal",
			dataIndex: "subtotal",
			key: "subtotal",
			render: (value: number) =>
				value !== undefined ? `Ksh ${value.toLocaleString()}` : "-",
		},
		{
			title: "VAT",
			dataIndex: "vat",
			key: "vat",
			render: (value: number) =>
				value !== undefined ? `Ksh ${value.toLocaleString()}` : "-",
		},
		{
			title: "Delivery Fee",
			dataIndex: "deliveryFee",
			key: "deliveryFee",
			render: (value: number) =>
				value !== undefined ? `Ksh ${value.toLocaleString()}` : "-",
		},
		{
			title: "Total",
			dataIndex: "amount",
			key: "amount",
			render: (value: number) =>
				value !== undefined ? `Ksh ${value.toLocaleString()}` : "-",
		},
		{
			title: "Status",
			dataIndex: "status",
			key: "status",
		},
		{
			title: "Transaction Ref",
			dataIndex: "transactionRef",
			key: "transactionRef",
		},
		{
			title: "Phone Number",
			dataIndex: "phoneNumber",
			key: "phoneNumber",
		},
		{
			title: "Paystack Ref",
			dataIndex: "paystackRef",
			key: "paystackRef",
		},
	];

	useEffect(() => {
		async function fetchPaymentsAndUsers() {
			try {
				const auth = getAuth();
				const user = auth.currentUser;
				if (!user) {
					setError("Please login as admin to view payments.");
					setLoading(false);
					return;
				}
				const idToken = await user.getIdToken();
				// Fetch all users
				const usersRes = await fetch("/api/users", {
					headers: { Authorization: `Bearer ${idToken}` },
				});
				const usersMap: Record<
					string,
					{ displayName?: string; email?: string; photoURL?: string }
				> = {};
				if (usersRes.ok) {
					const usersArr = await usersRes.json();
					if (Array.isArray(usersArr)) {
						usersArr.forEach((u) => {
							usersMap[u.uid] = {
								displayName: u.displayName,
								email: u.email,
								photoURL: u.photoURL,
							};
						});
					}
				}
				setUsers(usersMap);
				// Fetch payments
				const res = await fetch("/api/payments", {
					headers: { Authorization: `Bearer ${idToken}` },
				});
				if (!res.ok) {
					const data = await res.json();
					throw new Error(
						data.error || data.message || "Failed to fetch payments"
					);
				}
				const payments: PaymentItem[] = await res.json();
				// Sort by createdAt descending
				payments.sort(
					(a: PaymentItem, b: PaymentItem) =>
						new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
				);
				setData(payments);
			} catch (err) {
				setError(
					err instanceof Error ? err.message : "Error fetching payments"
				);
			} finally {
				setLoading(false);
			}
		}
		fetchPaymentsAndUsers();
	}, []);

	return (
		<div className="min-h-screen w-full bg-gradient-to-br from-pink-100 via-rose-50 to-purple-100">
			<div className="w-full container max-w-8xl mx-auto pt-12 px-4">
				<div className="flex flex-col items-center mb-8">
					<span className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-tr from-pink-200 via-pink-100 to-rose-100 shadow-lg mb-4">
						<FaCreditCard className="text-pink-400 text-4xl" />
					</span>
					<h2 className="text-3xl font-extrabold text-pink-600 mb-1 tracking-tight">
						All Payments
					</h2>
				</div>
				<div className="w-full bg-white/90 rounded-3xl shadow-2xl border border-pink-100 p-6">
					{loading ? (
						<div className="text-center py-8 text-lg text-pink-500 font-semibold">
							Loading payments...
						</div>
					) : error ? (
						<div className="text-center py-8 text-lg text-red-500 font-semibold">
							{error}
						</div>
					) : (
						<div className="w-full overflow-x-auto">
							<Table
								columns={columns}
								dataSource={data}
								pagination={false}
								rowKey="paymentId"
								className="rounded-xl overflow-hidden min-w-[1000px]"
								scroll={{ x: true }}
							/>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
