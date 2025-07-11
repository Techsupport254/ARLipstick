"use client";
import { Table } from "antd";
import "antd/dist/reset.css";
import { useEffect, useState } from "react";
import { getAuth } from "firebase/auth";
import type { User } from "../../../../types/models";
import Image from "next/image";

const columns = [
	{
		title: "User",
		key: "user",
		render: (_: unknown, user: User) => (
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
		),
	},
	{
		title: "Role",
		dataIndex: "role",
		key: "role",
		render: (v: string) => v || "-",
	},
	{
		title: "Bio",
		dataIndex: "bio",
		key: "bio",
		render: (v: string) => v || "-",
	},
	{
		title: "Phone",
		dataIndex: "phone",
		key: "phone",
		render: (v: string) => v || "-",
	},
	{
		title: "Created At",
		dataIndex: "createdAt",
		key: "createdAt",
		render: (v: string) => (v ? new Date(v).toLocaleString() : "-"),
	},
	{ title: "User ID", dataIndex: "uid", key: "uid" },
];

export default function AdminUsersPage() {
	const [users, setUsers] = useState<User[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");

	useEffect(() => {
		async function fetchUsers() {
			try {
				const auth = getAuth();
				const user = auth.currentUser;
				if (!user) {
					setError("Please login as admin.");
					setLoading(false);
					return;
				}
				const idToken = await user.getIdToken();
				const res = await fetch("/api/users", {
					headers: { Authorization: `Bearer ${idToken}` },
				});
				if (!res.ok) {
					const data = await res.json();
					throw new Error(data.message || "Failed to fetch users");
				}
				const data = await res.json();
				setUsers(data);
			} catch (err: unknown) {
				if (err instanceof Error) setError(err.message);
				else setError("Error fetching users");
			} finally {
				setLoading(false);
			}
		}
		fetchUsers();
	}, []);

	return (
		<div className="min-h-screen w-full bg-gradient-to-br from-pink-100 via-rose-50 to-purple-100">
			<div className="w-full max-w-7xl mx-auto pt-12 px-4">
				<h1 className="text-3xl font-extrabold text-pink-700 mb-8">
					User Management
				</h1>
				<div className="w-full bg-white/90 rounded-3xl shadow-2xl border border-pink-100 p-6">
					{loading ? (
						<div className="text-center py-8 text-lg text-pink-500 font-semibold">
							Loading users...
						</div>
					) : error ? (
						<div className="text-center py-8 text-lg text-red-500 font-semibold">
							{error}
						</div>
					) : (
						<div className="w-full overflow-x-auto">
							<Table
								columns={columns}
								dataSource={users}
								pagination={false}
								rowKey="uid"
								className="rounded-xl overflow-hidden min-w-[700px]"
							/>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
