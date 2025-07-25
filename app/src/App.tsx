import React, { lazy, Suspense } from "react";
import Navbar from "./components/Navbar";
import { Container, Box, Spacer, Text, Link, Spinner } from "@chakra-ui/react";
import { Route, Routes } from "react-router-dom";
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));
const StockView = lazy(() => import("./pages/StockView"));
const Leaderboard = lazy(() => import("./pages/Leaderboard"));
import NotFound from "./pages/NotFound";
import GetFunds from './pages/GetFunds';
import ChatPage from './pages/chatPages';
import ProtectedRoute from './components/ProtectedRoute';
import MarketSimulator from './components/marketSimulator';
import CrashPage from "./pages/CrashPage";
import GlobalNewsTicker from './components/GlobalNewsTicker';



export type Transaction = {
	symbol: string;
	purchasePrice: number;
	quantity: number;
	date: Date;
	type: "buy" | "sell";
};

export type Position = {
	symbol: string;
	longName: string;
	purchasePrice: number;
	purchaseDate: Date;
	quantity: number;
	regularMarketPrice: number;
	regularMarketPreviousClose: number;
	regularMarketChangePercent: number;
};

function App() {
	// Stock format: {symbol, count, price}
	// const [selectedAction, setSelectedAction] = useState("buy");
	// const [selelectedStock, setSelectedStock] = useState({
	// 	symbol: "",
	// 	price: 0,
	// });

	// const [selectedPrice, setSelectedPrice] = useState(0);

	return (
		<>
			<GlobalNewsTicker />
			<Navbar />
			<Container maxW="container.xl">
				<Spacer h="10" />
				<Box>
					<Suspense fallback={<Spinner />}>
						<Routes>
							<Route path="/" element={<Dashboard />}></Route>

							<Route path="/login" element={<Login />}></Route>

							<Route path="/signup" element={<Signup />}></Route>

							<Route path="/leaderboard" element={<Leaderboard />}></Route>

							<Route path="/stocks/:symbol" element={<StockView />}></Route>

							<Route 
							path="/get-funds" 
							element={
								<Suspense fallback={<Spinner />}>
									<GetFunds /> 
								</Suspense>
							} 
							/>
							<Route path="/chat" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />

							<Route path="/simulator" element={
								<ProtectedRoute>
									<MarketSimulator />
								</ProtectedRoute>
							} />

							<Route path="/crash" element={<CrashPage />} />

							{/* Add 404*/}
							<Route path="*" element={<NotFound />}></Route>
						</Routes>
					</Suspense>
				</Box>
			</Container>
			<Box textAlign="center" py="10">
				<Text fontSize="sm" color="gray.500">
					Built by{" "}
					<Link href="https://spike.codes" fontWeight="bold">
						Reynald Olinga
					</Link>{" "}
					on{" "}
					<Link href="https://github.com/spikecodes/stotra" fontWeight="bold">
						GitHub
					</Link>
				</Text>
			</Box>
		</>
	);
}



export default App;
