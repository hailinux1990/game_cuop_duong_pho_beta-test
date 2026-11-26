# game_cuop_duong_pho_beta-test
**PIXEL VICE CITY — UNITY CITY** — game thế giới mở **3D góc nhìn NGƯỜI THỨ BA** kiểu **GTA**, được đại tu toàn bộ hình ảnh theo chất lượng đồ họa **kiểu Unity 3D** chạy ngay trên nền web (WebGL).

▶ Chơi ngay: mở `index.html` trực tiếp, hoặc `python3 -m http.server 8123` rồi truy cập http://127.0.0.1:8123/ (bật WebGL + tăng tốc phần cứng).

## 🎨 Bản đại tu đồ họa kiểu UNITY 3D (thay đổi TOÀN BỘ cảnh game)
Toàn bộ môi trường, nhân vật và phương tiện đã được xây lại từ đầu với pipeline đồ họa hiện đại. Đợt nâng cấp 2 đẩy độ chân thực lên cao: **người thật, xe thật, cá mập thật, thành phố vật liệu thật**; đợt **OPEN WORLD GTA STYLE** bổ sung cảnh đêm, băng đảng có súng, nhảy/lăn né/ngồi/bò và hệ thống nhiệm vụ.

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
| 🧔 Nhân vật chính | Khuôn mặt 3D chi tiết (2 mắt + lông mày + mũi + miệng), trang phục đổi theo phong cách: áo sọc hiện đại (UNITY CITY) / áo hoa Tommy (VICE CITY neon) / áo khoác tối màu (GTA NIGHT); đủ vũ khí cầm tay phải: nắm đấm, dao, súng lục, AK-47, bom |
| 🛥️ Phương tiện sông | Thuyền máy: mũi nhọn, boong, cabin kính, lan can, máy đuôi — chạy 2 chiều dưới cầu, **gặp hero dưới nước thì phanh dừng lại rồi quay đầu rẽ sang nơi khác** |
| 🗺️ Minimap | Tự đổi màu theo phong cách đồ họa đang chọn; **mũi tên hero trên map di chuyển theo nhân vật và luôn xoay đúng hướng di chuyển** (đi bộ theo hướng nhìn, lái xe theo hướng mũi xe) |

### 🎭 NPC SỐNG ĐỘNG KIỂU GANGSTAR VEGAS (đợt nâng cấp 3)
- Mỗi người đi đường có **tâm trạng riêng**: bình thản, vui vẻ (cười tươi), **nói chuyện (miệng cử động)** , **cười lớn (ngửa đầu)** , **khóc (nước mắt chảy xuống má + vai run nức nở)** , tức giận (cau mày), sợ hãi (mắt mở to khi bị thương/chạy trốn)
- **Bong bóng cảm xúc emoji** 😊💬😂😭😠😱 nổi trên đầu người gần bạn + âm thanh cười/khóc cảnh cáo
- Dân công sở **mặc vest + cà vạt**, cảnh sát đội mũ băng đen + phù hiệu; **biển quảng cáo phát sáng về đêm** như đại lộ Vegas

## 🎭 3 phong cách đồ họa (Cài đặt → Phong cách đồ họa)
- **UNITY CITY (hiện đại)** — thành phố bê tông/kính ban ngày xanh trong, cây xanh, ánh sáng tự nhiên.
- **VICE CITY (neon)** — hoàng hôn cam-hồng, nhà pastel, **biển hiệu neon phát sáng** trên phố và nóc nhà chọc trời, hàng cọ bãi biển.
- **GTA NIGHT (thành phố về đêm)** — phong cách của prototype *Open World GTA Style*: bầu trời xanh đêm sâu, trăng + sao, đường phố tối với **biển hiệu neon, cửa sổ lên đèn, đèn đường rực rỡ, đèn pha xe**. Game mở đầu lúc 21:30 tối.
Chuyển phong cách bất cứ lúc nào — cả thế giới dựng lại, **giữ nguyên toàn bộ NPC, xe, hero và tiến trình trận đấu**.

## 🕹️ Bản cập nhật OPEN WORLD GTA STYLE (cảnh + NPC + gameplay giống game mẫu)
- **Thành phố về đêm**: trời đêm xanh thẫm, trăng sáng, sao lấp lánh, sương mù tối sâu — đúng chất video prototype; mở game là đã thấy cảnh đêm
- **Băng đảng côn đồ (12 tên, có súng)**: 3 bãi địa bàn, tên côn đồ mặc đồ đen đội mũ lưỡi trai đeo kính râm, **phát hiện → rượt đuổi → đứng bắn súng lục** vào người chơi, chấm đỏ trên minimap
- **Di chuyển đầy đủ như game mẫu**: **SPACE nhảy**, **CTRL lăn né đòn** (bất tử trong lúc lăn + lướt nhanh), **C ngồi**, **Z bò sát đất** (camera hạ theo tư thế)
- **Đổi vũ khí Q/E** (xoay vòng 5 slot), **F lên/xuống/trộm xe** (như phím Action của game mẫu), **V** camera sau lưng
- **HỆ THỐNG NHIỆM VỤ** (phím **M** xem bảng nhiệm vụ): luân phiên **🔫 Dọn dẹp băng đảng** (tiêu diệt N tên) → **🚗 Lấy xe hàng** (trộm xe được đánh dấu rồi lái vào vòng tròn giao hàng) → **📍 Điểm hẹn** (tới vòng tròn vàng); hoàn thành nhận thưởng **đạn / giáp / máu**
- **Dẫn đường rõ ràng — không bao giờ bí nhiệm vụ**: vòng tròn vàng + **đường kẻ + mũi tên vàng trên minimap** luôn chỉ thẳng vào mục tiêu (màn hình chính giữ sạch, không có mũi tên 3D nổi); nhiệm vụ diệt băng đảng **vạch sáng bám theo tên côn đồ SỐNG gần nhất**, HUD hiện **đã hạ X/N · còn M tên**, băng đảng **tự nhận tiếp viện** khi thiếu mục tiêu hoặc bị quét sạch; nhiệm vụ lấy xe/điểm hẹn hiện **khoảng cách còn lại (m)** trên HUD

## File
- **index.html** — giao diện: MENU chính (BẮT ĐẦU · CÀI ĐẶT · GIỚI THIỆU), menu tạm dừng, **bảng NHIỆM VỤ (M)**; HUD máu/giáp, sao truy nã, vũ khí 5 slot, đạn, **mục tiêu nhiệm vụ**, minimap, đồng hồ GMT+7 + nhãn SÁNG/CHIỀU/TỐI + thời tiết, đồng hồ tốc độ khi lái xe, WASTED, bảng lệnh cheat (phím ~)
- **js/game.js** — toàn bộ logic + đồ họa (thuần Three.js r128, ~7.000 dòng, không tài nguyên ngoài)
- **lib/three.min.js** — engine Three.js r128 (bản local)
- **tests/smoke.test.cjs** — 340 test headless (Node, không cần GPU): `node tests/smoke.test.cjs`
- **tests/browser-smoke.html** — harness kiểm tra game trong trình duyệt thật (stub WebGL)
- **tests/mesh_count.cjs** — đếm mesh/vertex/material để kiểm soát hiệu năng

## Kiểm chứng
- `node --check js/game.js` — cú pháp hợp lệ
- `node tests/smoke.test.cjs` — **340/340 PASS**, gồm toàn bộ gameplay cũ (map 11×11, 124 NPC, 34 xe, súng/bom/cheat/truy nã/cầu/thuyền/cá mập/thời tiết/giờ/menu…) **và đồ họa mới**: sky dome + sun sprite + fog ban ngày `0xbfd0de`, ocean ≥2000 m với **sóng vertex**, 128px facade + emissiveMap về đêm + **gạch/bê tông**, tháp kính, **xe thân bo tròn ExtrudeGeometry + mâm 5 căm + lốp vân**, **cá mập trắng lớn đủ vây/mang/bụng trắng**, rig người ≥20 mảnh (mắt có tròng màu, da texture, kính râm, mũ, tóc dài), đổi phong cách **modern ↔ neon ↔ night** giữ nguyên 124 NPC + 34 xe, neon có ≥50 biển hiệu + ≥20 thân cọ, fog hoàng hôn `0xff9a80` ở neon, fog đêm `0x070b18`, bóng đổ bám theo người chơi; **NPC biểu cảm**: mood đa dạng, nước mắt người khóc, miệng cử động khi nói, bong bóng 😂, vest cà vạt, đèn quảng cáo đêm; **Open World GTA Style**: 12 tên côn đồ có súng (địa bàn + rượt bắn), nhảy/lăn né/ngồi/bò, Q/E đổi vũ khí, F trộm xe, nhiệm vụ dọn băng đảng/lấy xe hàng/điểm hẹn + bảng nhiệm vụ M + beacon bám theo côn đồ sống + mũi tên dẫn đường trên minimap + tiếp viện băng đảng + phần thưởng; **bơi xuyên gầm cầu**: hero bơi tới cầu **vẫn ở trạng thái bơi** lướt dưới mặt cầu (không bị hất lên cầu đi bộ, mặt cầu tự trong-suốt để camera không che hero), **mỗi cây cầu có cá mập canh gác** dưới nước tấn công người bơi, **tàu thủy gặp hero dưới nước thì phanh dừng rồi quay đầu rẽ sang bờ bên kia**, **mũi tên hero trên minimap xoay đúng hướng khi di chuyển (kể cả khi lái xe)**
- Container không có GPU/WebGL nên không chụp ảnh render thật — mở link để xem trực tiếp.

## Điều khiển (Open World GTA Style)
**WASD / mũi tên** di chuyển theo hướng camera · **SHIFT** chạy · **SPACE** nhảy · **CTRL** lăn né đòn · **C** ngồi · **Z** bò · **CHUỘT** xoay camera (click để khoá) · **CLICK TRÁI** bắn/đánh · **GIỮ CHUỘT PHẢI** ngắm cận vai · **LĂN CHUỘT** zoom · **Q / E** đổi vũ khí · **1·2·3·4·5** chọn vũ khí (tay/dao/súng lục/AK-47/BOM) · **R** nạp đạn · **V** camera sau lưng · **F** lên/xuống/trộm xe · **M** xem nhiệm vụ · **ESC** menu tạm dừng · **~** bảng cheat (health/armor/reload) · **T** đổi thời tiết · **G** đổi giờ ngẫu nhiên · cảm ứng: joystick trái + kéo phải xoay camera, chạm nhanh để bắn
- **Nhìn mặt nhân vật**: đứng yên, nhân vật chính tự xoay người đối diện camera — xoay camera xung quanh để ngắm mặt/mắt/body từ mọi góc; người đi đường liếc nhìn bạn khi tới gần
- **Đâm xe**: lái xe tốc độ cao đâm vào xe khác → **kính vỡ văng mảnh**, xe bị đâm **dừng lại**, **bốc khói vài giây rồi NỔ** (nổ dây chuyền lan sang xe gần)
- **Giao thông thật**: mọi xe là **khối đặc** — không xe nào chui xuyên xe khác; xe AI **phanh xếp hàng sau xe phía trước** và **vòng tránh** xe chắn đường; **người đi bộ không đi xuyên được ô tô** (đi vòng); tất cả xe chạy đúng **làn phải**
- **NPC đi đứng tự nhiên**: xoay người **mượt mà** (không quay ngoắt), **tăng/giảm tốc từ từ**, **nhún nhẹ theo nhịp bước**, thân lắc nhẹ khi đi; đứng yên thì **nhìn quanh quét mắt** thay vì đơ cứng; bị xe chắn thì **tự chuyển hướng** thay vì đứng ỳ

## Gameplay (tóm tắt)
Thế giới mở 385×385 m: 4 cụm đô thị cao tầng, sông + cầu nâng 1,5 m, bãi biển; **124 NPC** (80 dân + 24 cảnh sát + 8 người bơi + **12 côn đồ băng đảng có súng**), 34 xe (26 dân + 8 xe cảnh sát), 11 thuyền, 15 cá mập (12 canh cầu + 3 tuần biển); truy nã 1–5 sao với xe cảnh sát truy đuổi + cảnh sát nhảy xuống bắn; trộm xe có tài xế (bị đẩy ra bỏ chạy); bắn xe nổ + nổ dây chuyền; bom nổ (slot 5) parabol + nổ dây chuyền; auto-aim ±12,6°, headshot, đạn bị tường chặn; nạp đạn có thời gian; giáp; **nhảy, lăn né (miễn thương), ngồi, bò**; bơi sông/biển + cá mập cắn (bơi xuyên gầm cầu được, cá mập rượt theo dưới gầm cầu); tàu thủy gặp người chơi dưới nước thì dừng lại rồi rẽ sang nơi khác; bắn từ trong xe (drive-by); **nhiệm vụ liên hoàn (dọn băng đảng / lấy xe hàng / điểm hẹn) với phần thưởng**; thời tiết nắng→mây→mưa→giông (chớp, sấm); mở game lúc 21:30 tối, giờ chạy liên tục + đồng hồ GMT+7; âm thanh thủ tục WebAudio.

## Chạy thử nhanh
```bash
# Ubuntu/Linux
python3 -m http.server 8123        # rồi mở http://127.0.0.1:8123/
# Windows
python -m http.server 8123
```
