%
O1001
; =========================================
; CONTA G-CODE GENERATOR (CGCG) ÇIKTISI
; EDITABLE DRAFT: verify controller, I/O, coordinates, and toolpath before use
; Tarih         : 2026-10-18
; Kontrolcü     : Synthetic generic XY profile
; Desen Tipi    : multi
; Toplam Kapak  : 6 adet
; Tahmini Süre  : ~3 dk 21 sn
; =========================================

; --- PROGRAM SETUP: OPERATOR REVIEW REQUIRED ---
G17 G21 G40 ; XY Düzlemi, Metrik, Telafi İptal
G90 ; Mutlak Programlama Modu
G54 ; İş parçası sıfır noktası seçimi
F1000 ; Tüm çalışma hızları varsayılan
M05 ; Configured process output off
M09 ; Configured coolant off

; --- GEOMETRY 0 ---
; --- DAİRE (Circle) R=50 Izgara 1x2 ---
; --- Kapak [1,1] ---
M05
G00 X200.000
G00 Y150.000
G02 X200.000 Y150.000 I-50.000 J0 F1000.000 ; Tam daire çizimi

; --- Kapak [1,2] ---
M05
G00 X200.000
G00 Y360.000
G02 X200.000 Y360.000 I-50.000 J0 F1000.000 ; Tam daire çizimi

; --- GEOMETRY 1 ---
; --- RECTANGLE GRID (RectangleGrid) 2x2 ---
; Eksen: X=YATAY(1000mm), Y=DİKEY(1000mm)
; --- Kapak [1,1] ---
M05
G00 X400.000
G00 Y150.000
G00 X600.000 ; Alt kenar çizimi
G00 Y290.000 ; Sağ kenar çizimi
G00 X400.000 ; Üst kenar çizimi
G00 Y150.000 ; Sol kenar çizimi

; --- Kapak [1,2] ---
M05
G00 X400.000
G00 Y350.000
G00 X600.000 ; Alt kenar çizimi
G00 Y490.000 ; Sağ kenar çizimi
G00 X400.000 ; Üst kenar çizimi
G00 Y350.000 ; Sol kenar çizimi

; --- Kapak [2,1] ---
M05
G00 X660.000
G00 Y150.000
G00 X860.000 ; Alt kenar çizimi
G00 Y290.000 ; Sağ kenar çizimi
G00 X660.000 ; Üst kenar çizimi
G00 Y150.000 ; Sol kenar çizimi

; --- Kapak [2,2] ---
M05
G00 X660.000
G00 Y350.000
G00 X860.000 ; Alt kenar çizimi
G00 Y490.000 ; Sağ kenar çizimi
G00 X660.000 ; Üst kenar çizimi
G00 Y350.000 ; Sol kenar çizimi

; --- PROGRAM FINISH ---
M05

; --- PROGRAM SONLANDIRMA ---
M30 ; Configured program end; controller behavior requires verification
% ; Program sonu