const express = require('express');
const { ethers, Wallet, JsonRpcProvider } = require('ethers');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const { BACKEND_UPDATER_PRIVATE_KEY, SOMNIA_RPC_URL, LEADERBOARD_CONTRACT_ADDRESS } = process.env;

if (!BACKEND_UPDATER_PRIVATE_KEY || !SOMNIA_RPC_URL || !LEADERBOARD_CONTRACT_ADDRESS) {
    console.error("Hata: Gerekli .env değişkenleri ayarlanmamış!");
    process.exit(1);
}

const contractABI = [
    "function updateScore(address _player, uint128 _newScore) external",
    "event ScoreUpdated(address indexed player, uint256 newScore)"
];

const provider = new JsonRpcProvider(SOMNIA_RPC_URL);
const wallet = new Wallet(BACKEND_UPDATER_PRIVATE_KEY, provider);
const leaderboardContract = new ethers.Contract(LEADERBOARD_CONTRACT_ADDRESS, contractABI, wallet);

app.post('/api/submit-score', async (req, res) => {
    const { player, score } = req.body;

    if (!player || !ethers.isAddress(player) || typeof score !== 'number' || score < 0) {
        return res.status(400).json({ message: "Geçersiz veya eksik parametreler: 'player' adresi ve 'score' sayısı gereklidir." });
    }

    try {
        console.log(`İstek alındı: Oyuncu ${player}, Skor ${score}`);

        const tx = await leaderboardContract.updateScore(player, score);
        
        console.log(`İşlem gönderildi. Hash: ${tx.hash}. Onay bekleniyor...`);
        await tx.wait();

        console.log(`İşlem onaylandı. Hash: ${tx.hash}`);
        res.status(200).json({ message: "Skor başarıyla kaydedildi!", txHash: tx.hash });

    } catch (error) {
        console.error("Blockchain işlemi sırasında hata:", error);
        res.status(500).json({ message: "Skor kaydedilirken bir sunucu hatası oluştu." });
    }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Liderlik tablosu backend sunucusu ${PORT} portunda çalışıyor.`);
    console.log(`Akıllı kontrata bağlı: ${LEADERBOARD_CONTRACT_ADDRESS}`);
});