package com.finanalysis.service;

import com.finanalysis.dto.CompanyDto;
import com.finanalysis.model.Company;
import com.finanalysis.repository.CompanyRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CompanyService {

    private final CompanyRepository companyRepository;

    public List<CompanyDto> findAll() {
        return companyRepository.findAll().stream().map(this::toDto).toList();
    }

    public CompanyDto findById(Long id) {
        return companyRepository.findById(id)
                .map(this::toDto)
                .orElseThrow(() -> new IllegalArgumentException("Company not found: " + id));
    }

    @Transactional
    public CompanyDto create(CompanyDto dto) {
        if (dto.taxNumber() != null && companyRepository.existsByTaxNumber(dto.taxNumber())) {
            throw new IllegalArgumentException("A company with tax number " + dto.taxNumber() + " already exists");
        }
        Company company = Company.builder()
                .name(dto.name())
                .taxNumber(dto.taxNumber())
                .sector(dto.sector())
                .description(dto.description())
                .build();
        return toDto(companyRepository.save(company));
    }

    @Transactional
    public CompanyDto update(Long id, CompanyDto dto) {
        Company company = companyRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Company not found: " + id));
        company.setName(dto.name());
        company.setTaxNumber(dto.taxNumber());
        company.setSector(dto.sector());
        company.setDescription(dto.description());
        return toDto(companyRepository.save(company));
    }

    @Transactional
    public void delete(Long id) {
        companyRepository.deleteById(id);
    }

    private CompanyDto toDto(Company c) {
        return new CompanyDto(c.getId(), c.getName(), c.getTaxNumber(), c.getSector(), c.getDescription());
    }
}
