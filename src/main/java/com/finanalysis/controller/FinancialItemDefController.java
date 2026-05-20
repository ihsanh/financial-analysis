package com.finanalysis.controller;

import com.finanalysis.dto.FinancialItemDefDto;
import com.finanalysis.model.StatementType;
import com.finanalysis.service.FinancialItemDefService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Kalem Tanımları", description = "Yüklenen tablolardan otomatik oluşan kod–isim sözlüğü")
@RestController
@RequestMapping("/api/item-defs")
@RequiredArgsConstructor
public class FinancialItemDefController {

    private final FinancialItemDefService service;

    @Operation(
            summary = "Kalem tanımlarını listele",
            description = """
                    Sisteme yüklenmiş tüm finansal kalemlerin kod–isim eşleşmesini döner.
                    Formül yazarken hangi `{KOD}` değerini kullanacağınızı öğrenmek için kullanın.

                    `type` parametresiyle tablo tipine göre filtreleyebilirsiniz.
                    """)
    @GetMapping
    public List<FinancialItemDefDto> findAll(
            @Parameter(description = "Tablo tipine göre filtre (isteğe bağlı)") @RequestParam(required = false) StatementType type) {
        return service.findAll(type);
    }

    @Operation(
            summary = "Sahipsiz kalem tanımlarını temizle",
            description = "Hiçbir finansal tabloda kullanılmayan kalem tanımlarını siler. " +
                    "Tablo silme işlemlerinin ardından çalıştırılması önerilir. " +
                    "Silinen kayıt sayısını döner.")
    @DeleteMapping("/orphans")
    public int cleanOrphans() {
        return service.cleanOrphans();
    }
}
