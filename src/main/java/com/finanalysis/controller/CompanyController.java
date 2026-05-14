package com.finanalysis.controller;

import com.finanalysis.dto.CompanyDto;
import com.finanalysis.service.CompanyService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/companies")
@RequiredArgsConstructor
public class CompanyController {

    private final CompanyService companyService;

    @GetMapping
    public List<CompanyDto> findAll() {
        return companyService.findAll();
    }

    @GetMapping("/{id}")
    public CompanyDto findById(@PathVariable Long id) {
        return companyService.findById(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CompanyDto create(@Valid @RequestBody CompanyDto dto) {
        return companyService.create(dto);
    }

    @PutMapping("/{id}")
    public CompanyDto update(@PathVariable Long id, @Valid @RequestBody CompanyDto dto) {
        return companyService.update(id, dto);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        companyService.delete(id);
    }
}
