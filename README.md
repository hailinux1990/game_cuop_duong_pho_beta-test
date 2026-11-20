# game_cuop_duong_pho_beta-test
**PIXEL VICE CITY — UNITY CITY** — game thế giới mở **3D góc nhìn NGƯỜI THỨ BA** kiểu **GTA**, được đại tu toàn bộ hình ảnh theo chất lượng đồ họa **kiểu Unity 3D** chạy ngay trên nền web (WebGL).

▶ Chơi ngay: mở `index.html` trực tiếp, hoặc `python3 -m http.server 8123` rồi truy cập http://127.0.0.1:8123/ (bật WebGL + tăng tốc phần cứng).

## 🎨 Bản đại tu đồ họa kiểu UNITY 3D (thay đổi TOÀN BỘ cảnh game)
Toàn bộ môi trường, nhân vật và phương tiện đã được xây lại từ đầu với pipeline đồ họa hiện đại — **gameplay giữ nguyên 100%**. Đợt nâng cấp 2 đẩy độ chân thực lên cao: **người thật, xe thật, cá mập thật, thành phố vật liệu thật**.

### 🧍 NGƯỜI THẬT (đợt nâng cấp 4 — mặt người kiểu Gangstar Vegas)
- **Đầu tỷ lệ thật** (nhỏ lại, cổ dài) + **mặt vẽ trực tiếp lên đầu cầu**: hốc mắt trũng, sống mũi + lỗ mũi, **đôi môi hồng**, má ửng, chân mày — mỗi tông da có mặt riêng
- **Tóc có sợi thật** (texture từng lọn tóc), mắt tròng màu + lòng đen 3D chồng lên hốc mắt, vai tròn, hông tròn
- Biểu cảm vẫn chạy trên mặt: cười, nói, cười lớn, khóc có nước mắt, tức giận, sợ hãi

### 🧍 NGƯỜI THẬT (đợt nâng cấp 2)
- **Da có texture** (đốm sáng/tối mịn) mọi tông da; **tay áo + cẳng tay trần** như người thật; **mắt có tròng màu** (nâu/xanh dương/xanh lá) + lòng đen; lông mày theo màu tóc
- **Quần áo vải dệt**: áo có nếp gấp + sợi dệt (cloth), quần **denim vân chéo**, áo in hoa nhiệt đới / sọc / kẻ plaid; giày thể thao có **đế trắng**
- Mũ cảnh sát có băng đen + phù hiệu vàng, bao súng + túi đựng; tóc búi; tai; xương hàm
### 🚗 XE CỘ THẬT
- Thân xe **bo tròn bằng ExtrudeGeometry** (vát cạnh), **vòm chắn bùn 4 bánh**, capo/cốp dốc, kính lái **ngả sau**, kính hông, kính hậu, **kính phản chiếu**, gương trên trụ, ăng-ten, ống xả
- **Lốp có vân hoa lốp** (texture), **mâm hợp kim 5 căm**, đèn pha tròn phát sáng, đèn hậu đỏ, lưới tản nhiệt + viền crôm
### 🦈 CÁ MẬP THẬT
- Dáng **cá mập trắng lớn**: thân thủy động + mõm nhọn + cuống đuôi, **vây lưng cong vút**, vây lưng sau, **vây ngực/bụng/hậu môn**, **đuôi lưỡi liềm** vẫy khi bơi, **khe mang**, mắt, miệng, **bụng trắng** (countershading)
### 🏙️ THÀNH PHỐ THẬT
- Mặt dựng **gạch xây** (khu đông bắc) / **bê tông có vết ố + mạch panel** (các khu còn lại); **cửa sổ có rèm** khi lên đèn; biển hiệu cửa hàng có **chữ đọc được** (HOTEL, CAFE, 24H, SHOP, BAR, FOOD)
- Đường **nhựa asphalt** có vết nứt + vá, vỉa hè **khe co giãn**, **cỏ có ngọn lá**, **cát có hạt**, mái nhà **sỏi**
- **Nước có sóng lăn thật** (vertex waves) trên biển + sông, kèm texture sóng cuộn

| Hạng mục | Nội dung mới |
|---|---|
| 🖥️ Pipeline render kiểu Unity | Linear→**sRGB**, **ACES Filmic tone mapping**, **bóng đổ mềm PCFSoft** (1024/2048), vật liệu **PBR MeshStandardMaterial** (roughness/metalness), camera bóng đổ **bám theo người chơi** |
| 🏙️ Thành phố | Tòa nhà có **mặt dựng 128px**: ô cửa kính có khung, **cửa sổ phát sáng về đêm (emissiveMap)**, tầng trệt **cửa hàng mái hiên sọc + kính phản chiếu**, lan can mái, máy lạnh/bồn nước/ăng-ten, **tháp kính curtain-wall** ở lõi đô thị; 4 khu màu riêng |
| 🚦 Đường phố | Vỉa hè có **bó vỉa nổi**, vạch kẻ đường + **vạch sang đường zebra** tại mọi ngã tư (gộp thành 1 draw call), **đèn đường hàng loạt** phát sáng về đêm, ghế công viên, trạm xe buýt, trụ cứu hỏa, biển quảng cáo |
| 🌳 Thiên nhiên | Cọ cong trái dừa (neon), cây lá xanh + cây tùng (modern), công viên cỏ, cồn cát bãi biển |
| 🌊 Nước | Biển + sông dùng **vật liệu nước động** (texture sóng cuộn, phản chiếu ánh nắng), bờ kè đá, trụ cầu + giàn chắn cầu |
| ☀️ Bầu trời | Sky dome gradient theo **phong cách × thời điểm** (sáng/chiều/tối), mây bông xốp 3D, mặt trời/mặt trăng/stars |
| 🚗 Xe cộ | **Sedan, sport (cánh gió), SUV, taxi (biển phát sáng), xe cảnh sát (đèn chớp xanh-đỏ)** — chassis, kính cabin, nóc, cột, cản, lưới tản nhiệt, biển số, **đèn pha/đèn hậu phát sáng**, gương chiếu hậu, **mâm crôm + vỏ xe quay**; tài xế ngồi trong xe; cửa mở/đóng khi lên xuống |
| 🧍 Người đi đường | Humanoid chi tiết: đầu + **tai + hàm + mắt trắng/đồng tử/lông mày/mũi/miệng**, thân có cổ áo, tay 2 khớp (cánh tay + cẳng tay), chân 2 khớp, giày; **tóc ngắn/dài/búi/hói, mũ lưỡi trai, mũ cảnh sát**, kính râm, dây chuyền, huy hiệu, bao súng; áo **hoa nhiệt đới / sọc / kẻ plaid** (texture thủ tục), váy nữ; đổ bóng thật từ thân/đầu |
| 🧔 Nhân vật chính | Khuôn mặt 3D chi tiết (2 mắt + lông mày + mũi + miệng), trang phục đổi theo phong cách: áo sọc hiện đại (UNITY CITY) / áo hoa Tommy (VICE CITY neon); đủ vũ khí cầm tay phải: nắm đấm, dao, súng lục, AK-47, bom |
| 🛥️ Phương tiện sông | Thuyền máy: mũi nhọn, boong, cabin kính, lan can, máy đuôi — chạy 2 chiều dưới cầu |
| 🗺️ Minimap | Tự đổi màu theo phong cách đồ họa đang chọn |

### 🎭 NPC SỐNG ĐỘNG KIỂU GANGSTAR VEGAS (đợt nâng cấp 3)
- Mỗi người đi đường có **tâm trạng riêng**: bình thản, vui vẻ (cười tươi), **nói chuyện (miệng cử động)** , **cười lớn (ngửa đầu)** , **khóc (nước mắt chảy xuống má + vai run nức nở)** , tức giận (cau mày), sợ hãi (mắt mở to khi bị thương/chạy trốn)
- **Bong bóng cảm xúc emoji** 😊💬😂😭😠😱 nổi trên đầu người gần bạn + âm thanh cười/khóc cảnh cáo
- Dân công sở **mặc vest + cà vạt**, cảnh sát đội mũ băng đen + phù hiệu; **biển quảng cáo phát sáng về đêm** như đại lộ Vegas

## 🎭 2 phong cách đồ họa (Cài đặt → Phong cách đồ họa)
- **UNITY CITY (hiện đại)** — mặc định: thành phố bê tông/kính ban ngày xanh trong, cây xanh, ánh sáng tự nhiên.
- **VICE CITY (neon)** — hoàng hôn cam-hồng, nhà pastel, **biển hiệu neon phát sáng** trên phố và nóc nhà chọc trời, hàng cọ bãi biển.
Chuyển phong cách bất cứ lúc nào — cả thế giới dựng lại, **giữ nguyên toàn bộ NPC, xe, hero và tiến trình trận đấu**.

## File
- **index.html** — giao diện: MENU chính (BẮT ĐẦU · CÀI ĐẶT · GIỚI THIỆU), menu tạm dừng; HUD máu/giáp, sao truy nã, vũ khí 5 slot, đạn, minimap, đồng hồ GMT+7 + nhãn SÁNG/CHIỀU/TỐI + thời tiết, đồng hồ tốc độ khi lái xe, WASTED, bảng lệnh cheat (phím ~)
- **js/game.js** — toàn bộ logic + đồ họa (thuần Three.js r128, ~5.600 dòng, không tài nguyên ngoài)
- **lib/three.min.js** — engine Three.js r128 (bản local)
- **tests/smoke.test.cjs** — 286 test headless (Node, không cần GPU): `node tests/smoke.test.cjs`
- **tests/browser-smoke.html** — harness kiểm tra game trong trình duyệt thật (stub WebGL)
- **tests/mesh_count.cjs** — đếm mesh/vertex/material để kiểm soát hiệu năng

## Kiểm chứng
- `node --check js/game.js` — cú pháp hợp lệ
- `node tests/smoke.test.cjs` — **286/286 PASS**, gồm toàn bộ gameplay cũ (map 11×11, 112 NPC, 34 xe, súng/bom/cheat/truy nã/cầu/thuyền/cá mập/thời tiết/giờ/menu…) **và đồ họa mới**: sky dome + sun sprite + fog ban ngày `0xbfd0de`, ocean ≥2000 m với **sóng vertex**, 128px facade + emissiveMap về đêm + **gạch/bê tông**, tháp kính, **xe thân bo tròn ExtrudeGeometry + mâm 5 căm + lốp vân**, **cá mập trắng lớn đủ vây/mang/bụng trắng**, rig người ≥20 mảnh (mắt có tròng màu, da texture, kính râm, mũ, tóc dài), đổi phong cách **modern ↔ neon** giữ nguyên 112 NPC + 34 xe, neon có ≥50 biển hiệu + ≥20 thân cọ, fog hoàng hôn `0xff9a80` ở neon, fog đêm `0x0a0e1c`, bóng đổ bám theo người chơi; **NPC biểu cảm**: mood đa dạng, nước mắt người khóc, miệng cử động khi nói, bong bóng 😂, vest cà vạt, đèn quảng cáo đêm
- Container không có GPU/WebGL nên không chụp ảnh render thật — mở link để xem trực tiếp.

## Điều khiển (giữ nguyên)
**WASD / mũi tên** di chuyển theo hướng camera · **SHIFT** chạy · **CHUỘT** xoay camera (click để khoá) · **CLICK TRÁI** bắn/đánh · **GIỮ CHUỘT PHẢI** ngắm cận vai · **LĂN CHUỘT** zoom · **1·2·3·4·5** vũ khí (tay/dao/súng lục/AK-47/BOM) · **R** nạp đạn · **C** camera sau lưng · **E** lên/xuống/trộm xe · **~** bảng cheat (health/armor/reload) · **T** đổi thời tiết · **G** đổi giờ ngẫu nhiên · **ESC / M / ☰** menu tạm dừng · cảm ứng: joystick trái + kéo phải xoay camera
- **Nhìn mặt nhân vật**: đứng yên, nhân vật chính tự xoay người đối diện camera — xoay camera xung quanh để ngắm mặt/mắt/body từ mọi góc; người đi đường liếc nhìn bạn khi tới gần
- **Đâm xe**: lái xe tốc độ cao đâm vào xe khác → **kính vỡ văng mảnh**, nạn nhân **bốc khói vài giây rồi NỔ** (nổ dây chuyền lan sang xe gần)

## Gameplay giữ nguyên (tóm tắt)
Thế giới mở 385×385 m: 4 cụm đô thị cao tầng, sông + cầu nâng 1,5 m, bãi biển; 112 người đi đường (80 dân + 24 cảnh sát + 8 người bơi), 34 xe (26 dân + 8 xe cảnh sát), 11 thuyền, 6 cá mập; truy nã 1–5 sao với xe cảnh sát truy đuổi + cảnh sát nhảy xuống bắn; trộm xe có tài xế (bị đẩy ra bỏ chạy); bắn xe nổ + nổ dây chuyền; bom nổ (slot 5) parabol + nổ dây chuyền; auto-aim ±12,6°, headshot, đạn bị tường chặn; nạp đạn có thời gian; giáp; bơi sông/biển + cá mập cắn; bắn từ trong xe (drive-by); thời tiết nắng→mây→mưa→giông (chớp, sấm); giờ ngẫu nhiên SÁNG/CHIỀU/TỐI + đồng hồ GMT+7; âm thanh thủ tục WebAudio.

## Chạy thử nhanh
```bash
# Ubuntu/Linux
python3 -m http.server 8123        # rồi mở http://127.0.0.1:8123/
# Windows
python -m http.server 8123
```
