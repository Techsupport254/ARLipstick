"use client";
import { useEffect, useState } from "react";
import {
	getAuth,
	signInWithPopup,
	GoogleAuthProvider,
	onAuthStateChanged,
} from "firebase/auth";
import { app } from "../../firebaseConfig";
import Image from "next/image";
import { useRouter } from "next/navigation";

type UserType = {
	uid: string;
	email: string;
	displayName: string;
	photoURL: string | null;
};

export default function LoginPage() {
	const [user, setUser] = useState<UserType | null>(null);
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);
	const router = useRouter();

	useEffect(() => {
		const auth = getAuth(app);
		const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
			if (firebaseUser) {
				const idToken = await firebaseUser.getIdToken();
				const res = await fetch("/api/auth", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ idToken }),
				});
				const data = await res.json();
				setUser(data.user);
				console.log("User object (onAuthStateChanged):", data.user);
				router.replace("/dashboard");
			}
		});
		return () => unsubscribe();
	}, [router]);

	const handleGoogleLogin = async () => {
		setLoading(true);
		setError("");
		try {
			const auth = getAuth(app);
			const provider = new GoogleAuthProvider();
			const result = await signInWithPopup(auth, provider);
			const idToken = await result.user.getIdToken();
			// Send idToken to backend
			const res = await fetch("/api/auth", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ idToken }),
			});
			const data = await res.json();
			if (res.ok) {
				setUser(data.user);
				console.log("User object (login):", data.user);
				router.replace("/dashboard");
			} else {
				setError(data.message || "Login failed");
			}
		} catch (err) {
			setError((err as Error).message);
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-100 via-rose-50 to-purple-100">
			<div className="w-full max-w-md p-8 bg-white/90 rounded-2xl shadow-2xl border border-pink-100 flex flex-col items-center">
				<div className="mb-6 flex flex-col items-center">
					<Image
						src="/ar-lipstick-logo.svg"
						alt="AR Lipstick Logo"
						width={64}
						height={64}
						className="w-16 h-16 mb-2 drop-shadow-lg"
						priority
					/>
					<h1 className="text-3xl font-extrabold text-pink-600 tracking-tight mb-1">
						Welcome to AR Lipstick
					</h1>
					<p className="text-gray-500 text-sm">Sign in to continue</p>
				</div>
				{user ? (
					<div className="text-center">
						<p className="mb-4 text-lg font-semibold text-pink-700">
							Welcome, {user.displayName}!
						</p>
						<div className="mx-auto rounded-full w-20 h-20 mb-4 border-4 border-pink-200 shadow overflow-hidden relative">
							<Image
								src={user.photoURL || "/ar-lipstick-logo.svg"}
								alt="User avatar"
								width={80}
								height={80}
								onError={(e) => {
									(e.target as HTMLImageElement).src = "/ar-lipstick-logo.svg";
								}}
								className="object-cover w-full h-full"
							/>
						</div>
						<p className="text-sm text-gray-500">{user.email}</p>
					</div>
				) : (
					<button
						onClick={handleGoogleLogin}
						className="w-full flex items-center justify-center gap-3 bg-white border border-gray-200 hover:border-pink-400 hover:shadow-lg text-gray-700 font-semibold py-3 px-6 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-pink-300 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
						disabled={loading}
					>
						<svg className="w-6 h-6" viewBox="0 0 48 48">
							<g>
								<path
									fill="#4285F4"
									d="M44.5 20H24v8.5h11.7C34.1 33.1 29.6 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c2.7 0 5.2.9 7.2 2.4l6.4-6.4C34.1 5.1 29.3 3 24 3 12.9 3 4 11.9 4 23s8.9 20 20 20c11 0 19.7-8 19.7-20 0-1.3-.1-2.7-.2-4z"
								/>
								<path
									fill="#34A853"
									d="M6.3 14.7l6.6 4.8C14.3 16.1 18.7 13 24 13c2.7 0 5.2.9 7.2 2.4l6.4-6.4C34.1 5.1 29.3 3 24 3c-7.1 0-13.1 4.1-16.1 10.1z"
								/>
								<path
									fill="#FBBC05"
									d="M24 43c5.6 0 10.3-1.8 13.7-4.9l-6.3-5.2C29.6 36 27 37 24 37c-5.6 0-10.3-3.7-12-8.7l-6.6 5.1C7.9 39.1 15.3 43 24 43z"
								/>
								<path
									fill="#EA4335"
									d="M44.5 20H24v8.5h11.7C34.1 33.1 29.6 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c2.7 0 5.2.9 7.2 2.4l6.4-6.4C34.1 5.1 29.3 3 24 3 12.9 3 4 11.9 4 23s8.9 20 20 20c11 0 19.7-8 19.7-20 0-1.3-.1-2.7-.2-4z"
								/>
							</g>
						</svg>
						<span className="font-bold text-base">
							{loading ? "Signing in..." : "Sign in with Google"}
						</span>
					</button>
				)}
				{error && (
					<p className="text-red-600 mt-6 text-center font-medium bg-red-50 border border-red-200 rounded-lg py-2 px-4 shadow-sm animate-pulse">
						{error}
					</p>
				)}
			</div>
		</div>
	);
}
