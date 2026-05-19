package com.finanalysis.controller;

import com.finanalysis.dto.FinancialItemDefDto;
import com.finanalysis.model.StatementType;
import com.finanalysis.service.FinancialItemDefService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/item-defs")
@RequiredArgsConstructor
public class FinancialItemDefController {

    private final FinancialItemDefService service;

    @GetMapping
    public List<FinancialItemDefDto> findAll(
            @RequestParam(required = false) StatementType type) {
        return service.findAll(type);
    }

    @DeleteMapping("/orphans")
    public int cleanOrphans() {
        return service.cleanOrphans();
    }
}
