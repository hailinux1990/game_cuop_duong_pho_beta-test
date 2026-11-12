# game_cuop_duong_pho_beta-test
PIXEL VICE CITY — game thế giới mở **3D góc nhìn NGƯỜI THỨ BA** kiểu **GTA Vice City** (hoàng hôn Miami: neon hồng–lam, cọ biển, thành phố pastel).

▶ Chơi ngay: http://127.0.0.1:8123/ — nếu trang không truy cập được, khởi động lại server bằng lệnh: `cd game_test_gta && python3 -m http.server 8123`. Máy cần bật WebGL (Chrome/Edge/Firefox mới, bật tăng tốc phần cứng).

## File đã tạo
- **index.html** — giao diện: HUD máu, sao truy nã, khung vũ khí đang cầm, bảng chọn vũ khí (4 slot), đạn, minimap, tâm ngắm GIỮA MÀN HÌNH, đồng hồ tốc độ khi lái xe, màn hình bắt đầu / WASTED
- **js/game.js** — toàn bộ logic game (thuần Three.js, ~3.500 dòng)
- **lib/three.min.js** — engine Three.js r128 (bản local)
- **tests/smoke.test.cjs** — smoke test headless (Node, không cần GPU): `node tests/smoke.test.cjs`
- **tests/browser-smoke.html** — harness chạy game trong trình duyệt thật với WebGL giả lập (kiểm tra DOM/2D canvas/rAF)

## 🎥 Bản cập nhật lớn: GÓC NHÌN NGƯỜI THỨ BA (GTA Vice City style)
| Thay đổi | Chi tiết |
|---|---|
| 🎥 Camera bám sau lưng | Camera orbit quanh vai nhân vật, kéo theo mượt mà; chuột xoay TRÁI/PHẢI full 360° + LÊN/XUỐNG (pitch −63°…+46°), click để khoá chuột, ESC mở khoá; chưa khoá thì **giữ chuột phải đứng yên = ngắm, kéo chuột phải = xoay camera**; phím **C** chỉnh camera về sau lưng |
| 🎯 Tâm ngắm hoàn chỉnh | Nhân vật nằm DƯỚI tâm ngắm (không che đường ngắm); crosshair đổi vàng khi ngắm, đỏ khi có địch trong vùng auto-aim |
| 🖱️ Ngắm trung tâm + auto-aim | Tâm ngắm cố định giữa màn hình; đạn bay đúng tia từ họng súng tới điểm tâm ngắm; bắn ngang hông có cone auto-aim ~12,6° kiểu GTA, ngắm chuột phải siết cone ~8° và giảm tản đạn |
| 🎯 Ngắm cận vai | Giữ CHUỘT PHẢI: camera zoom sát vai phải, nhân vật đi chậm lại, bắn chính xác hơn |
| 🔍 Lăn chuột | Zoom xa/gần camera (2,2 – 10 m) |
| 🚶 WASD theo hướng camera | W đi về phía camera nhìn, A/D đi ngang; nhân vật xoay mượt về hướng chạy (khi ngắm thì xoay về hướng ngắm) |
| 🏃 Animation | Chạy/nhảy bước chân, tay cầm súng giơ sẵn, giày + bàn tay + mặt (mắt/mũi) cho nhân vật chính |
| 🚗 Camera khi lái xe | Camera tự bơi về sau đuôi xe sau khi ngừng xoay chuột; đồng hồ KM/H hiện ở giữa dưới màn hình |
| 🧱 Chống khuất tầm nhìn | Nhà nào nằm giữa camera và nhân vật tự mờ thành kính (X-ray) rồi đặc lại khi hết chắn — giờ áp dụng cho mọi hướng xoay |
| 🌅 Không khí Vice City | Bầu trời hoàng hôn gradient, mặt trời lặn phát sáng, sương hồng; 4 khu pastel (xanh ngọc, san hô, tím oải hương, hồng neon); biển + bãi cát + vòng bọt sóng; cọ biển; biển hiệu neon phát sáng trên nhà cao tầng và mặt tiền cửa hàng |
| 🔫 Súng lục bắn TỪNG PHÁT | Click 1 lần = 1 viên, không bắn liên thanh khi giữ chuột; AK-47 GIỮ chuột = xả liên thanh |
| ⏱️ Nạp đạn có thời gian | Súng lục 0,9 s · AK-47 1,4 s; hết đạn tự động nạp, HUD hiện % nạp; đổi vũ khí sẽ huỷ nạp |
| 🎯 Giật & tản đạn | Mỗi phát giật camera + tay súng; xả AK làm loang tản đạn, ngắm chuột phải/đứng yên thì tụ lại; giật nhẹ hơn khi ngắm; rút/nạp đạn có animation hạ súng |
| 🧱 Đạn bị tường chặn | Đạn bắn vào nhà/toà cao tầng bị chặn tại mặt tường (bụi tung lên), không xuyên qua nhà để trúng mục tiêu phía sau |
| 🌦️ Thời tiết ngẫu nhiên | Chu kỳ NẮNG → MÂY ĐEN KÉO VỀ → MƯA RƠI → GIÔNG BÃO, chuyển ngẫu nhiên 30–90 s; mây trôi trên trời, sương/ánh sáng/sky tối dần, mặt trời mờ hẳn khi mưa, hạt mưa bám quanh người chơi, âm thanh mưa + sấm, **chớp trắng** khi giông; phím **T** đổi thời tiết ngay |
| 🕒 Đồng hồ GMT+7 | HUD giữa trên màn hình hiển thị **giờ:phút:giây chạy thật theo múi giờ Việt Nam (+7)**, độc lập với timezone máy, kèm nhãn thời tiết hiện tại (NẮNG/MÂY/MƯA/GIÔNG) |
| 🚶 Di chuyển & lên xe mượt | Nhân vật tăng/giảm tốc có trọng lượng (không bật/tắt tốc độ tức thì), nhịp chân + tiếng bước chân, thân nghiêng nhẹ khi chạy nước rút, mặt quay theo hướng chạy; **va chạm thân người (bán kính 0,32 m)** với tường & xe đỗ (không xuyên tường/xe); gợi ý **"E — LÊN XE / TRỘM XE"** khi tới gần xe; lên xe camera tự xoay theo hướng xe; xuống xe chọn **cửa an toàn** (trái/phải/trước/sau, không vào tường/nước/xe khác), không cho lên xe xuyên tường; xe đã trộm **đứng yên** đúng chỗ sau khi xuống |
| 🧍 NPC 3D kiểu Vice City | Bỏ khối pixel & khuôn mặt pixel: nhân vật low-poly 3D có đầu tròn + mặt 3D (mắt/mũi/miệng), tóc ngắn/dài/hói, kính râm, mũ lưỡi trai/mũ cảnh sát, thân áo thuôn, hông + thắt lưng, tay + bàn tay, chân + giày; áo in hoa nhiệt đới (texture thủ tục), da dẻ đa dạng, nữ thân hình nhỏ + tóc dài, cảnh sát đồng phục + huy hiệu — vẫn giữ animation tay chân, hitbox và headshot như cũ |
| 🕶️ Nhân vật chính Tommy | Áo sơ mi kem, quần âu tối, tóc đen, khuôn mặt 3D chi tiết (mắt trắng + đồng tử + lông mày, mũi, miệng) — không còn khuôn mặt pixel |
| 📱 Cảm ứng | Nửa trái = joystick di chuyển; nửa phải = kéo để xoay camera, chạm nhanh = tấn công; nút 1-4/R/E vẫn dùng bàn phím |

## Gameplay cũ GIỮ NGUYÊN (chỉ đổi góc nhìn)
| Tính năng | Trạng thái |
|---|---|
| Thế giới 3D mở 11×11 block (~385×385): đường, vỉa hè, nhà cao tầng, cọ, sông + cầu vòm | Giữ nguyên, thêm bãi biển/biển/neon |
| 4 THÀNH PHỐ/TRUNG TÂM (kiểu Đông Anh): cụm tháp cao tầng, càng vào lõi càng cao (~57 m) | Giữ nguyên bố cục + đổi màu pastel |
| 🚤 Thuyền chạy 2 chiều trên sông, chui dưới cầu nâng | Giữ nguyên |
| 🚔 34 xe (26 dân + 8 cảnh sát) + 104 người đi đường (80 dân + 24 cảnh sát) | Giữ nguyên |
| 🏎️ Lái xe mượt: fixed-timestep 60 Hz + nội suy render | Giữ nguyên, thêm cảm giác tăng tốc có trọng lượng |
| 🚗💥 Bắn xe nổ tung + nổ dây chuyền + sát thương vụ nổ | Giữ nguyên |
| 🚨 Hệ truy nã 1–5 sao, cảnh sát tăng cường theo sao, xe cảnh sát TRUY ĐUỔI, cảnh sát nhảy xuống bắn | Giữ nguyên |
| Trộm xe có người lái (tài xế bị đẩy ra bỏ chạy / cảnh sát quay lại rượt) | Giữ nguyên |
| Chạm xe không chết, xe AI phanh dừng trước mặt người chơi | Giữ nguyên |
| Vũ khí: tay / dao / súng lục 100 viên / AK-47 500 viên, mô hình cầm tay + HUD icon | Giữ nguyên |
| Aim-assist ±7°, headshot, đạn xuyên chuẩn, tầm bắn 220–340 m | Giữ nguyên |
| Âm thanh thủ tục (WebAudio): súng, nổ, còi hú, đấm, chém, va chạm, tiếng phố | Giữ nguyên |

## Điều khiển
**WASD / mũi tên** di chuyển theo hướng camera · **SHIFT** chạy · **CHUỘT** xoay camera (click để khoá chuột) · **CLICK TRÁI** tấn công/bắn · **CLICK PHẢI (giữ)** ngắm cận vai · **LĂN CHUỘT** zoom
**1·2·3·4** đổi vũ khí (tay / dao / súng lục bắn từng phát / AK-47 xả liên thanh) · **R** nạp đạn (có thời gian) · **C** chỉnh camera về sau lưng · **E** lên xe / xuống xe / TRỘM XE
Hỗ trợ cảm ứng (joystick trái + kéo phải để xoay camera + chạm để tấn công)

## Cơ chế bổ sung (chất GTA)
- Hệ truy nã 1–5 sao: đánh dân/cảnh sát, trộm xe, cho xe nổ làm tăng sao → cảnh sát bộ hành + ĐỘI XE CẢNH SÁT truy đuổi, bắn trả; trốn sau ~12s giảm sao, hết sao mọi lực lượng rút lui
- Xe AI đâm người đi đường KHÔNG cộng sao oan (chỉ khi chính bạn lái). Máu hồi dần, màn hình đỏ khi trúng đạn, "WASTED" khi chết rồi hồi sinh
- Âm thanh thủ tục (WebAudio): súng, AK-47, đạn dội kim loại, TIẾNG NỔ BIG BOOM, CÒI HÚ CẢNH SÁT, đấm, chém, va chạm — không cần file ngoài

## Kiểm chứng
- Cú pháp JS hợp lệ (`node --check js/game.js`)
- Smoke test headless **149/149 PASS** (`node tests/smoke.test.cjs`): map 11×11 + 4 cụm thành phố cao tầng (82 tháp ≥25 m, cao nhất ~57 m) + sông/cầu nâng; spawn an toàn; 104 NPC + 34 xe đủ tài xế + 11 thuyền; AK-47 500 viên; **súng lục bắn từng phát / AK xả liên thanh**; **nạp đạn có thời gian + tự động nạp khi hết đạn**; **đạn bị tường chặn**; **giật súng + tản đạn**; aim-assist headshot/chest; **camera người thứ ba** (đứng sau lưng nhân vật, nhìn theo hướng camera, **nhân vật nằm dưới tâm ngắm**, tâm ngắm khớp hướng nhìn); **WASD theo hướng camera** (xoay camera đổi hướng đi, D đi ngang); **camera lái xe** + đồng hồ tốc độ; **ngắm cận vai** thu hẹp khoảng cách; **lăn chuột zoom**; **xoay chuột trái/phải/lên/xuống + đảo trục + độ nhạy**; **tăng/giảm tốc nhân vật + va chạm thân người với tường**; **gợi ý lên xe + camera bám hướng xe + xuống xe chọn cửa an toàn + xe trộm đứng yên**; **thời tiết nắng/mây/mưa/giông + mưa hạt + chớp + đổi thời tiết bằng T**; **đồng hồ GMT+7 chạy thật (HH:MM:SS)**; xe phanh dừng không hại player; giật xe có tài xế; BẮN AK → XE NỔ + NỔ DÂY CHUYỀN; vòng đời TRUY ĐUỔI cảnh sát; TĂNG CƯỜNG THEO SAO (1→1, 3→3 xe + bộ hành, 5→tất cả); THUYỀN 2 chiều qua cầu nâng; BIỂU TƯỢNG vũ khí trên tay + HUD; FIX CHE KHUẤT bằng raycast segment–AABB theo camera thứ ba (fade 0.30 ↔ đặc 1.0); ĐỘ MƯỢT xe AI trượt ~0.16 đơn vị/khung hình.
- Smoke test trong **trình duyệt thật** (`tests/browser-smoke.html`): game boot, 361 khung hình rAF, minimap vẽ đủ 150×150, 34 xe + 104 NPC, **0 lỗi JS**.
- Rig test: NPC cao ~1,8–2,0 m đứng trên mặt đất, đủ đầu/tóc/bàn tay/giày/chân/tay, >=15 mảnh low-poly, cả khu phố có kính râm, mũ, tóc dài; hero có mặt 3D 2 mắt.
- Container không có GPU/WebGL nên không chụp ảnh render thật được — mở link để xem trực tiếp.
