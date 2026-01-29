/**
 * 保时捷卡券中心 - 交互脚本
 * 实现字段联动、弹窗控制等功能
 */

document.addEventListener('DOMContentLoaded', function() {
    // 初始化所有联动逻辑
    initBusinessDomainCascade();
    initBusinessTypeCascade();
    initDiscountTypeCascade();
    initActivationTypeCascade();
    initValidityTypeCascade();
    initNotificationSwitches();
    initCharCounters();
    initIssueMethodToggle();
    initActivateMethodToggle();
    initPreviewListeners();
    initRedeemChannelCascade();
    initProductScopeCascade();
    initApplicableDealerCascade();
    initExchangeContentPreview();
    initLinkProductButton();
    initCouponTitleAutoFill();
    initAddCustomContent();

    // 初始化默认状态（售后服务券已选中，需要显示对应的抵扣类型）
    initDefaultState();
});

/**
 * 初始化默认状态
 * 根据默认选中的业务领域和业务类型显示对应的抵扣类型选项
 */
function initDefaultState() {
    const domainRadio = document.querySelector('input[name="businessDomain"]:checked');
    const typeRadio = document.querySelector('input[name="businessType"]:checked');

    if (domainRadio && typeRadio) {
        // 显示对应的业务类型选项
        const typeOptions = document.querySelectorAll('.business-type-option');
        typeOptions.forEach(option => {
            if (option.dataset.domain === domainRadio.value) {
                option.classList.remove('hidden');
            }
        });

        // 隐藏业务类型提示
        const typeHint = document.getElementById('businessTypeHint');
        if (typeHint) {
            typeHint.classList.add('hidden');
        }

        // 根据选中的业务类型显示对应的抵扣类型选项
        const discountOptions = document.querySelectorAll('.discount-type-option');
        discountOptions.forEach(option => {
            const supportedTypes = option.dataset.types.split(',');
            if (supportedTypes.includes(typeRadio.value)) {
                option.classList.remove('hidden');
            }
        });

        // 隐藏抵扣类型提示
        const discountTypeHint = document.getElementById('discountTypeHint');
        if (discountTypeHint) {
            discountTypeHint.classList.add('hidden');
        }

        // 根据业务类型初始化核销渠道
        updateRedeemChannelsByBusinessType(typeRadio.value);
    }

    // 初始化预览
    updatePreview();
}

/**
 * 业务领域 -> 业务类型 联动
 */
function initBusinessDomainCascade() {
    const domainRadios = document.querySelectorAll('input[name="businessDomain"]');
    const typeOptions = document.querySelectorAll('.business-type-option');
    const typeHint = document.getElementById('businessTypeHint');
    const discountTypeHint = document.getElementById('discountTypeHint');
    const scopeSection = document.getElementById('scopeSection');

    if (!domainRadios.length) return;

    domainRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            const selectedDomain = this.value;

            // 隐藏所有业务类型选项并取消选中
            typeOptions.forEach(option => {
                option.classList.add('hidden');
                option.querySelector('input').checked = false;
            });

            // 显示对应的业务类型选项
            let visibleTypeOptions = [];
            typeOptions.forEach(option => {
                if (option.dataset.domain === selectedDomain) {
                    option.classList.remove('hidden');
                    visibleTypeOptions.push(option);
                }
            });

            // 如果只有一个业务类型选项，自动选中并触发联动
            if (visibleTypeOptions.length === 1) {
                const input = visibleTypeOptions[0].querySelector('input');
                input.checked = true;
                // 触发 change 事件以联动抵扣类型等
                input.dispatchEvent(new Event('change'));
            } else {
                // 重置抵扣类型
                resetDiscountType();
                if (discountTypeHint) {
                    discountTypeHint.classList.remove('hidden');
                    discountTypeHint.textContent = '请先选择业务类型';
                }
            }

            // 隐藏提示
            if (typeHint) {
                typeHint.classList.add('hidden');
            }

            // 隐藏适用范围模块
            if (scopeSection) {
                scopeSection.classList.add('hidden');
            }

            // 重置核销渠道
            resetRedeemChannels();

            // 重置归属类型和激活方式
            resetOwnerTypeAndActivationType();

            // 更新预览
            updatePreview();
        });
    });
}

/**
 * 业务类型 -> 成本中心、履约平台、抵扣类型、核销渠道、归属类型、激活方式 联动
 */
function initBusinessTypeCascade() {
    const typeRadios = document.querySelectorAll('input[name="businessType"]');
    const discountOptions = document.querySelectorAll('.discount-type-option');
    const discountTypeHint = document.getElementById('discountTypeHint');
    const costCenterMember = document.getElementById('costCenterMember');
    const costCenterReadonly = document.getElementById('costCenterReadonly');
    const costCenterHint = document.getElementById('costCenterHint');
    const fulfillmentPlatformFixed = document.getElementById('fulfillmentPlatformFixed');
    const fulfillmentPlatform = document.getElementById('fulfillmentPlatform');
    const scopeSection = document.getElementById('scopeSection');
    const ownerTypeFixed = document.getElementById('ownerTypeFixed');
    const ownerTypeGroup = document.getElementById('ownerTypeGroup');
    const ownerTypeHint = document.getElementById('ownerTypeHint');
    const ownerTypeFixedHint = document.getElementById('ownerTypeFixedHint');
    const activationTypeFixed = document.getElementById('activationTypeFixed');
    const activationType = document.getElementById('activationType');
    const activationTypeFixedHint = document.getElementById('activationTypeFixedHint');
    const thirdpartyBrandRow = document.getElementById('thirdpartyBrandRow');

    if (!typeRadios.length) return;

    typeRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            const selectedType = this.value;

            // 根据业务类型显示对应的抵扣类型选项
            let visibleDiscountOptions = [];
            discountOptions.forEach(option => {
                const supportedTypes = option.dataset.types.split(',');
                if (supportedTypes.includes(selectedType)) {
                    option.classList.remove('hidden');
                    visibleDiscountOptions.push(option);
                } else {
                    option.classList.add('hidden');
                    option.querySelector('input').checked = false;
                }
            });

            // 如果只有一个抵扣类型选项，自动选中
            if (visibleDiscountOptions.length === 1) {
                const input = visibleDiscountOptions[0].querySelector('input');
                input.checked = true;
                // 触发 change 事件以显示对应配置
                input.dispatchEvent(new Event('change'));
            }

            // 隐藏提示
            if (discountTypeHint) {
                discountTypeHint.classList.add('hidden');
            }

            // 重置抵扣类型配置
            hideAllDiscountConfigs();

            // 三方品牌显示（仅三方券）
            if (thirdpartyBrandRow) {
                if (selectedType === 'thirdparty') {
                    thirdpartyBrandRow.classList.remove('hidden');
                } else {
                    thirdpartyBrandRow.classList.add('hidden');
                }
            }

            // 成本中心联动
            const costCenterEcommerce = document.getElementById('costCenterEcommerce');

            if (selectedType === 'member') {
                // 会员券：可切换 PCN-会员 / 经销商
                if (costCenterMember) costCenterMember.classList.remove('hidden');
                if (costCenterEcommerce) costCenterEcommerce.classList.add('hidden');
                if (costCenterReadonly) costCenterReadonly.classList.add('hidden');
                if (costCenterHint) costCenterHint.classList.add('hidden');
            } else if (selectedType === 'ecommerce') {
                // 电商券：可切换 PCN-电商 / TP
                if (costCenterMember) costCenterMember.classList.add('hidden');
                if (costCenterEcommerce) costCenterEcommerce.classList.remove('hidden');
                if (costCenterReadonly) costCenterReadonly.classList.add('hidden');
                if (costCenterHint) costCenterHint.classList.add('hidden');
            } else {
                // 其他券类型：只读
                if (costCenterMember) costCenterMember.classList.add('hidden');
                if (costCenterEcommerce) costCenterEcommerce.classList.add('hidden');
                if (costCenterReadonly) {
                    costCenterReadonly.classList.remove('hidden');
                    // 根据业务类型设置成本中心
                    const costCenterMap = {
                        'aftersales': 'PCN-售后',
                        'pickup': 'PCN-售后',
                        'brandprotect': 'PCN-售后',
                        'thirdparty': 'PCN-三方',
                        'giftexchange': 'PCN-三方',
                        'pec': 'PCN-PEC',
                        'lifestyletype': 'PCN-Lifestyle',
                        'teq': 'PCN-TEQ',
                        'rsa': 'PCN-RSA'
                    };
                    costCenterReadonly.value = costCenterMap[selectedType] || 'PCN-售后';
                }
                if (costCenterHint) costCenterHint.classList.remove('hidden');
            }

            // 履约平台联动
            if (selectedType === 'member' || selectedType === 'ecommerce') {
                // 会员券/电商券：固定为PCN自有平台
                if (fulfillmentPlatformFixed) fulfillmentPlatformFixed.classList.remove('hidden');
                if (fulfillmentPlatform) fulfillmentPlatform.classList.add('hidden');
            } else {
                // 其他券类型：可选择
                if (fulfillmentPlatformFixed) fulfillmentPlatformFixed.classList.add('hidden');
                if (fulfillmentPlatform) fulfillmentPlatform.classList.remove('hidden');
            }

            // 适用范围模块联动（仅电商券显示）
            if (scopeSection) {
                if (selectedType === 'ecommerce') {
                    scopeSection.classList.remove('hidden');
                } else {
                    scopeSection.classList.add('hidden');
                }
            }

            // 归属类型联动
            const ownerTypeFixedPerson = document.getElementById('ownerTypeFixedPerson');
            const ownerTypeFixedVehicle = document.getElementById('ownerTypeFixedVehicle');
            const ownerTypeFixedPersonHint = document.getElementById('ownerTypeFixedPersonHint');
            const ownerTypeFixedVehicleHint = document.getElementById('ownerTypeFixedVehicleHint');

            // 固定跟人的券类型：三方券、PEC、Lifestyle、TEQ、RSA、电商
            const personOnlyTypes = ['thirdparty', 'pec', 'lifestyletype', 'teq', 'rsa', 'ecommerce'];
            // 固定跟车的券类型：品牌保障券、活动礼品券
            const vehicleOnlyTypes = ['brandprotect', 'giftexchange'];
            // 可切换的券类型：会员券、售后服务券、取送车券
            const switchableTypes = ['member', 'aftersales', 'pickup'];

            if (personOnlyTypes.includes(selectedType)) {
                // 固定跟人
                if (ownerTypeFixedPerson) ownerTypeFixedPerson.classList.remove('hidden');
                if (ownerTypeFixedVehicle) ownerTypeFixedVehicle.classList.add('hidden');
                if (ownerTypeGroup) ownerTypeGroup.classList.add('hidden');
                if (ownerTypeHint) ownerTypeHint.classList.add('hidden');
                if (ownerTypeFixedPersonHint) ownerTypeFixedPersonHint.classList.remove('hidden');
                if (ownerTypeFixedVehicleHint) ownerTypeFixedVehicleHint.classList.add('hidden');
            } else if (vehicleOnlyTypes.includes(selectedType)) {
                // 固定跟车
                if (ownerTypeFixedPerson) ownerTypeFixedPerson.classList.add('hidden');
                if (ownerTypeFixedVehicle) ownerTypeFixedVehicle.classList.remove('hidden');
                if (ownerTypeGroup) ownerTypeGroup.classList.add('hidden');
                if (ownerTypeHint) ownerTypeHint.classList.add('hidden');
                if (ownerTypeFixedPersonHint) ownerTypeFixedPersonHint.classList.add('hidden');
                if (ownerTypeFixedVehicleHint) ownerTypeFixedVehicleHint.classList.remove('hidden');
            } else {
                // 可切换
                if (ownerTypeFixedPerson) ownerTypeFixedPerson.classList.add('hidden');
                if (ownerTypeFixedVehicle) ownerTypeFixedVehicle.classList.add('hidden');
                if (ownerTypeGroup) ownerTypeGroup.classList.remove('hidden');
                if (ownerTypeHint) ownerTypeHint.classList.remove('hidden');
                if (ownerTypeFixedPersonHint) ownerTypeFixedPersonHint.classList.add('hidden');
                if (ownerTypeFixedVehicleHint) ownerTypeFixedVehicleHint.classList.add('hidden');
            }

            // 激活方式联动
            if (selectedType === 'ecommerce') {
                // 电商券：固定为固定时间激活
                if (activationTypeFixed) activationTypeFixed.classList.remove('hidden');
                if (activationType) activationType.classList.add('hidden');
                if (activationTypeFixedHint) activationTypeFixedHint.classList.remove('hidden');
                // 显示固定时间激活的有效期配置
                showValidityConfig('fixedDate');
            } else {
                // 其他券类型：可选择
                if (activationTypeFixed) activationTypeFixed.classList.add('hidden');
                if (activationType) activationType.classList.remove('hidden');
                if (activationTypeFixedHint) activationTypeFixedHint.classList.add('hidden');
            }

            // 核销渠道联动
            updateRedeemChannelsByBusinessType(selectedType);

            // 适用门店联动（仅售后服务券、取送车券显示）
            const applicableDealerRow = document.getElementById('applicableDealerRow');
            const previewDealerSection = document.getElementById('previewDealerSection');
            if (selectedType === 'aftersales' || selectedType === 'pickup') {
                if (applicableDealerRow) applicableDealerRow.classList.remove('hidden');
                if (previewDealerSection) previewDealerSection.classList.remove('hidden');
            } else {
                if (applicableDealerRow) applicableDealerRow.classList.add('hidden');
                if (previewDealerSection) previewDealerSection.classList.add('hidden');
            }

            // 关联商品按钮联动（仅电商券显示）
            const linkProductBtn = document.getElementById('linkProductBtn');
            if (selectedType === 'ecommerce') {
                if (linkProductBtn) linkProductBtn.classList.remove('hidden');
            } else {
                if (linkProductBtn) linkProductBtn.classList.add('hidden');
            }

            // 更新预览
            updatePreview();
        });
    });
}

/**
 * 更新核销渠道选项
 */
function updateRedeemChannelsByBusinessType(businessType) {
    const redeemOptions = document.querySelectorAll('.redeem-channel-option');
    const redeemChannelHint = document.getElementById('redeemChannelHint');
    const poasServiceTypeRow = document.getElementById('poasServiceTypeRow');

    // 隐藏所有核销渠道选项
    redeemOptions.forEach(option => {
        option.classList.add('hidden');
        option.querySelector('input').checked = false;
    });

    // 显示对应业务类型的核销渠道选项
    redeemOptions.forEach(option => {
        const supportedTypes = option.dataset.types.split(',');
        if (supportedTypes.includes(businessType)) {
            option.classList.remove('hidden');
        }
    });

    // 隐藏提示
    if (redeemChannelHint) {
        redeemChannelHint.classList.add('hidden');
    }

    // 隐藏POAS服务类型
    if (poasServiceTypeRow) {
        poasServiceTypeRow.classList.add('hidden');
    }
}

/**
 * 重置核销渠道
 */
function resetRedeemChannels() {
    const redeemOptions = document.querySelectorAll('.redeem-channel-option');
    const redeemChannelHint = document.getElementById('redeemChannelHint');
    const poasServiceTypeRow = document.getElementById('poasServiceTypeRow');

    redeemOptions.forEach(option => {
        option.classList.add('hidden');
        option.querySelector('input').checked = false;
    });

    if (redeemChannelHint) {
        redeemChannelHint.classList.remove('hidden');
    }

    if (poasServiceTypeRow) {
        poasServiceTypeRow.classList.add('hidden');
    }
}

/**
 * 核销渠道 -> POAS服务类型 联动
 */
function initRedeemChannelCascade() {
    const redeemChannelGroup = document.getElementById('redeemChannelGroup');
    const poasServiceTypeRow = document.getElementById('poasServiceTypeRow');

    if (!redeemChannelGroup) return;

    redeemChannelGroup.addEventListener('change', function(e) {
        if (e.target.name === 'redeemChannel') {
            // 如果选择了POAS，显示服务类型
            if (e.target.value === 'poas') {
                if (poasServiceTypeRow) poasServiceTypeRow.classList.remove('hidden');
            } else {
                if (poasServiceTypeRow) poasServiceTypeRow.classList.add('hidden');
            }
        }
    });
}

/**
 * 商品范围联动
 */
function initProductScopeCascade() {
    const productScopeRadios = document.querySelectorAll('input[name="productScope"]');
    const specifiedProductHint = document.getElementById('specifiedProductHint');

    if (!productScopeRadios.length) return;

    productScopeRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            if (this.value === 'specified') {
                if (specifiedProductHint) specifiedProductHint.classList.remove('hidden');
            } else {
                if (specifiedProductHint) specifiedProductHint.classList.add('hidden');
            }
        });
    });
}

/**
 * 重置归属类型和激活方式
 */
function resetOwnerTypeAndActivationType() {
    const ownerTypeFixed = document.getElementById('ownerTypeFixed');
    const ownerTypeGroup = document.getElementById('ownerTypeGroup');
    const ownerTypeHint = document.getElementById('ownerTypeHint');
    const ownerTypeFixedHint = document.getElementById('ownerTypeFixedHint');
    const activationTypeFixed = document.getElementById('activationTypeFixed');
    const activationType = document.getElementById('activationType');
    const activationTypeFixedHint = document.getElementById('activationTypeFixedHint');

    // 显示可选择的归属类型
    if (ownerTypeFixed) ownerTypeFixed.classList.add('hidden');
    if (ownerTypeGroup) ownerTypeGroup.classList.remove('hidden');
    if (ownerTypeHint) ownerTypeHint.classList.remove('hidden');
    if (ownerTypeFixedHint) ownerTypeFixedHint.classList.add('hidden');

    // 显示可选择的激活方式
    if (activationTypeFixed) activationTypeFixed.classList.add('hidden');
    if (activationType) activationType.classList.remove('hidden');
    if (activationTypeFixedHint) activationTypeFixedHint.classList.add('hidden');

    // 重置选中状态
    document.querySelectorAll('input[name="ownerType"]').forEach(r => r.checked = false);
    document.querySelectorAll('input[name="activationType"]').forEach(r => r.checked = false);

    // 隐藏有效期配置
    hideAllValidityConfigs();
}

/**
 * 重置抵扣类型
 */
function resetDiscountType() {
    const discountOptions = document.querySelectorAll('.discount-type-option');
    discountOptions.forEach(option => {
        option.classList.add('hidden');
        option.querySelector('input').checked = false;
    });
    hideAllDiscountConfigs();
}

/**
 * 隐藏所有抵扣类型配置
 */
function hideAllDiscountConfigs() {
    const configs = [
        'thresholdConfigMember', 'exchangeConfigMember',
        'thresholdConfigEcom', 'projectConfigEcom',
        'thresholdConfigAftersales', 'discountConfig', 'projectConfigAftersales'
    ];
    configs.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });
}

/**
 * 隐藏所有有效期配置
 */
function hideAllValidityConfigs() {
    const configs = ['validityImmediate', 'validityFixedDate', 'validityUserActivate', 'validityDelayActivate'];
    configs.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });
    const validityHint = document.getElementById('validityHint');
    if (validityHint) validityHint.classList.remove('hidden');
}

/**
 * 显示指定的有效期配置
 */
function showValidityConfig(activationType) {
    hideAllValidityConfigs();
    const validityHint = document.getElementById('validityHint');
    if (validityHint) validityHint.classList.add('hidden');

    switch(activationType) {
        case 'immediate':
            const validityImmediate = document.getElementById('validityImmediate');
            if (validityImmediate) validityImmediate.classList.remove('hidden');
            break;
        case 'fixedDate':
            const validityFixedDate = document.getElementById('validityFixedDate');
            if (validityFixedDate) validityFixedDate.classList.remove('hidden');
            break;
        case 'userActivate':
            const validityUserActivate = document.getElementById('validityUserActivate');
            if (validityUserActivate) validityUserActivate.classList.remove('hidden');
            break;
        case 'delayActivate':
            const validityDelayActivate = document.getElementById('validityDelayActivate');
            if (validityDelayActivate) validityDelayActivate.classList.remove('hidden');
            break;
    }
}

/**
 * 抵扣类型 -> 配置字段 联动
 */
function initDiscountTypeCascade() {
    const discountRadios = document.querySelectorAll('input[name="discountType"]');

    if (!discountRadios.length) return;

    discountRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            // 隐藏所有配置
            hideAllDiscountConfigs();

            // 显示对应配置
            switch(this.value) {
                case 'threshold':
                    // 会员券满减
                    const thresholdConfigMember = document.getElementById('thresholdConfigMember');
                    if (thresholdConfigMember) thresholdConfigMember.classList.remove('hidden');
                    break;
                case 'exchange':
                    // 会员券兑换
                    const exchangeConfigMember = document.getElementById('exchangeConfigMember');
                    if (exchangeConfigMember) exchangeConfigMember.classList.remove('hidden');
                    break;
                case 'threshold-ecom':
                    // 电商券满减
                    const thresholdConfigEcom = document.getElementById('thresholdConfigEcom');
                    if (thresholdConfigEcom) thresholdConfigEcom.classList.remove('hidden');
                    break;
                case 'project-ecom':
                    // 电商券项目抵扣
                    const projectConfigEcom = document.getElementById('projectConfigEcom');
                    if (projectConfigEcom) projectConfigEcom.classList.remove('hidden');
                    break;
                case 'threshold-aftersales':
                    // 售后服务券满减
                    const thresholdConfigAftersales = document.getElementById('thresholdConfigAftersales');
                    if (thresholdConfigAftersales) thresholdConfigAftersales.classList.remove('hidden');
                    break;
                case 'discount':
                    // 售后服务券折扣
                    const discountConfig = document.getElementById('discountConfig');
                    if (discountConfig) discountConfig.classList.remove('hidden');
                    break;
                case 'project-aftersales':
                    // 售后服务券项目抵扣
                    const projectConfigAftersales = document.getElementById('projectConfigAftersales');
                    if (projectConfigAftersales) projectConfigAftersales.classList.remove('hidden');
                    break;
            }

            updatePreview();
        });
    });

    // 监听配置字段变化
    const configInputs = [
        'reduceAmountMember', 'membershipYears',
        'thresholdAmountEcom', 'reduceAmountEcom',
        'thresholdAmountAftersales', 'reduceAmountAftersales',
        'discountThreshold', 'discountRate',
        'projectSelectAftersales'
    ];
    configInputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', updatePreview);
            el.addEventListener('change', updatePreview);
        }
    });
}

/**
 * 激活方式 -> 有效期配置 联动
 */
function initActivationTypeCascade() {
    const activationRadios = document.querySelectorAll('input[name="activationType"]');

    if (!activationRadios.length) return;

    activationRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            showValidityConfig(this.value);
            updatePreview();
        });
    });
}

/**
 * 有效期类型切换（发放即激活 和 用户领取后激活 的子选项）
 */
function initValidityTypeCascade() {
    // 发放即激活的有效期类型切换
    const immediateTypeRadios = document.querySelectorAll('input[name="validityTypeImmediate"]');
    const immediateFixed = document.getElementById('validityImmediateFixed');
    const immediateDays = document.getElementById('validityImmediateDays');

    immediateTypeRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            if (this.value === 'fixed') {
                if (immediateFixed) immediateFixed.classList.remove('hidden');
                if (immediateDays) immediateDays.classList.add('hidden');
            } else {
                if (immediateFixed) immediateFixed.classList.add('hidden');
                if (immediateDays) immediateDays.classList.remove('hidden');
            }
            updatePreview();
        });
    });

    // 用户领取后激活的有效期类型切换
    const userTypeRadios = document.querySelectorAll('input[name="validityTypeUser"]');
    const userFixed = document.getElementById('validityUserFixed');
    const userDays = document.getElementById('validityUserDays');

    userTypeRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            if (this.value === 'fixed') {
                if (userFixed) userFixed.classList.remove('hidden');
                if (userDays) userDays.classList.add('hidden');
            } else {
                if (userFixed) userFixed.classList.add('hidden');
                if (userDays) userDays.classList.remove('hidden');
            }
            updatePreview();
        });
    });

    // 监听日期和天数输入
    const dateInputs = document.querySelectorAll('input[type="date"]');
    dateInputs.forEach(input => {
        input.addEventListener('change', updatePreview);
    });

    const daysInputs = ['validityDays', 'validityAfterActivation1', 'validityAfterActivation2', 'validityAfterActivation3', 'activationWindow'];
    daysInputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', updatePreview);
        }
    });
}

/**
 * 通知规则开关 -> 策略下拉框启用/禁用
 */
function initNotificationSwitches() {
    const notifications = [
        { switch: 'notifyIssue', strategy: 'notifyIssueStrategy' },
        { switch: 'notifyActivate', strategy: 'notifyActivateStrategy' },
        { switch: 'notifyRedeem', strategy: 'notifyRedeemStrategy' },
        { switch: 'notifyExpireSoon', strategy: 'notifyExpireSoonStrategy' },
        { switch: 'notifyExpired', strategy: 'notifyExpiredStrategy' },
        { switch: 'notifyVoid', strategy: 'notifyVoidStrategy' }
    ];

    notifications.forEach(item => {
        const switchEl = document.getElementById(item.switch);
        const strategyEl = document.getElementById(item.strategy);

        if (switchEl && strategyEl) {
            switchEl.addEventListener('change', function() {
                strategyEl.disabled = !this.checked;
                if (!this.checked) {
                    strategyEl.value = '';
                }
            });
        }
    });
}

/**
 * 文本框字数统计
 */
function initCharCounters() {
    const counters = [
        { textarea: 'couponDesc', counter: 'descCount' },
        { textarea: 'usageRules', counter: 'rulesCount' },
        { textarea: 'notes', counter: 'notesCount' }
    ];

    counters.forEach(item => {
        const textarea = document.getElementById(item.textarea);
        const counter = document.getElementById(item.counter);

        if (textarea && counter) {
            textarea.addEventListener('input', function() {
                counter.textContent = this.value.length;
                updatePreview();
            });
        }
    });
}

/**
 * 发放方式切换（弹窗内）
 */
function initIssueMethodToggle() {
    const methodRadios = document.querySelectorAll('input[name="issueMethod"]');
    const ruleContent = document.getElementById('issueRuleContent');
    const excelContent = document.getElementById('issueExcelContent');

    if (!methodRadios.length) return;

    methodRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            if (this.value === 'rule') {
                if (ruleContent) ruleContent.classList.remove('hidden');
                if (excelContent) excelContent.classList.add('hidden');
            } else {
                if (ruleContent) ruleContent.classList.add('hidden');
                if (excelContent) excelContent.classList.remove('hidden');
            }
        });
    });
}

/**
 * 激活方式切换（弹窗内）
 */
function initActivateMethodToggle() {
    const methodRadios = document.querySelectorAll('input[name="activateMethod"]');
    const ruleContent = document.getElementById('activateRuleContent');
    const excelContent = document.getElementById('activateExcelContent');

    if (!methodRadios.length) return;

    methodRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            if (this.value === 'rule') {
                if (ruleContent) ruleContent.classList.remove('hidden');
                if (excelContent) excelContent.classList.add('hidden');
            } else {
                if (ruleContent) ruleContent.classList.add('hidden');
                if (excelContent) excelContent.classList.remove('hidden');
            }
        });
    });
}

/**
 * 弹窗显示/隐藏
 */
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('hidden');
    }
}

function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('hidden');
    }
}

// 点击遮罩层关闭弹窗
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal-overlay')) {
        e.target.classList.add('hidden');
    }
});

/**
 * 初始化预览监听器
 */
function initPreviewListeners() {
    // 监听名称输入
    const nameInput = document.getElementById('couponName');
    if (nameInput) {
        nameInput.addEventListener('input', updatePreview);
    }

    // 监听规则标题和内容
    const ruleTitleInput = document.getElementById('usageRulesTitle');
    if (ruleTitleInput) {
        ruleTitleInput.addEventListener('input', updatePreview);
    }

    // 监听注意事项标题和内容
    const notesTitleInput = document.getElementById('notesTitle');
    if (notesTitleInput) {
        notesTitleInput.addEventListener('input', updatePreview);
    }

    // 监听三方品牌输入
    const thirdpartyBrandInput = document.getElementById('thirdpartyBrand');
    if (thirdpartyBrandInput) {
        thirdpartyBrandInput.addEventListener('input', updatePreview);
    }
}

/**
 * 更新预览
 */
function updatePreview() {
    updatePreviewTag();
    updatePreviewName();
    updatePreviewValidity();
    updatePreviewRules();
    updatePreviewNotes();
}

/**
 * 更新预览标签（只显示业务类型，不显示业务领域）
 */
function updatePreviewTag() {
    const previewTag = document.getElementById('previewTag');
    if (!previewTag) return;

    const typeRadio = document.querySelector('input[name="businessType"]:checked');

    const typeMap = {
        'member': '会员券',
        'thirdparty': '三方券',
        'giftexchange': '活动礼品券',
        'pec': 'PEC券',
        'lifestyletype': 'Lifestyle券',
        'aftersales': '售后服务券',
        'pickup': '取送车券',
        'brandprotect': '品牌保障券',
        'teq': 'TEQ券',
        'rsa': 'RSA券',
        'ecommerce': '电商券'
    };

    const typeText = typeRadio ? typeMap[typeRadio.value] : '业务类型';

    previewTag.textContent = typeText;
}

/**
 * 更新预览名称（纯文案格式：如 "10元 满减券"）
 */
function updatePreviewName() {
    const previewName = document.getElementById('previewName');
    if (!previewName) return;

    // 优先使用卡券标题字段的值
    const couponTitleInput = document.getElementById('couponTitle');
    if (couponTitleInput && couponTitleInput.value) {
        previewName.textContent = couponTitleInput.value;
        return;
    }

    const discountRadio = document.querySelector('input[name="discountType"]:checked');
    if (!discountRadio) {
        previewName.textContent = '优惠内容 抵扣类型';
        return;
    }

    let valueText = '';
    let typeText = '';

    // 获取抵扣类型名称
    const typeMap = {
        'threshold': '满减券',
        'exchange': '兑换券',
        'exchange-thirdparty': '兑换券',
        'project-pec': '项目抵扣券',
        'project-lifestyle': '项目抵扣券',
        'project-teq': '项目抵扣券',
        'project-rsa': '项目抵扣券',
        'threshold-ecom': '满减券',
        'project-ecom': '项目抵扣券',
        'threshold-aftersales': '满减券',
        'discount': '折扣券',
        'project-aftersales': '项目抵扣券',
        // 新增券类型
        'threshold-pickup': '满减券',
        'discount-pickup': '折扣券',
        'project-brandprotect': '项目抵扣券',
        'project-giftexchange': '项目抵扣券'
    };
    typeText = typeMap[discountRadio.value] || '抵扣类型';

    // 获取优惠内容
    switch(discountRadio.value) {
        case 'threshold':
            // 会员券满减
            const reduceAmountMember = document.getElementById('reduceAmountMember');
            if (reduceAmountMember && reduceAmountMember.value) {
                valueText = reduceAmountMember.value + '元';
            } else {
                valueText = '优惠内容';
            }
            break;
        case 'exchange':
            // 会员券兑换
            const membershipYears = document.getElementById('membershipYears');
            if (membershipYears && membershipYears.value) {
                valueText = membershipYears.value + '年会籍';
            } else {
                valueText = '优惠内容';
            }
            break;
        case 'exchange-thirdparty':
            // 三方券兑换：兑换内容 兑换券
            const exchangeContent = document.getElementById('exchangeContent');
            if (exchangeContent && exchangeContent.value) {
                valueText = exchangeContent.value;
            } else {
                valueText = '兑换内容';
            }
            break;
        case 'project-pec':
            valueText = 'PEC项目';
            break;
        case 'project-lifestyle':
            valueText = 'Lifestyle项目';
            break;
        case 'project-teq':
            valueText = 'TEQ项目';
            break;
        case 'project-rsa':
            valueText = 'RSA项目';
            break;
        case 'threshold-ecom':
            // 电商券满减
            const reduceAmountEcom = document.getElementById('reduceAmountEcom');
            if (reduceAmountEcom && reduceAmountEcom.value) {
                valueText = reduceAmountEcom.value + '元';
            } else {
                valueText = '优惠内容';
            }
            break;
        case 'project-ecom':
            valueText = '商品';
            break;
        case 'threshold-aftersales':
            // 售后服务券满减
            const reduceAmountAftersales = document.getElementById('reduceAmountAftersales');
            if (reduceAmountAftersales && reduceAmountAftersales.value) {
                valueText = reduceAmountAftersales.value + '元';
            } else {
                valueText = '优惠内容';
            }
            break;
        case 'discount':
            const discountRate = document.getElementById('discountRate');
            if (discountRate && discountRate.value) {
                valueText = discountRate.value + '折';
            } else {
                valueText = '优惠内容';
            }
            break;
        case 'project-aftersales':
            const projectSelect = document.getElementById('projectSelectAftersales');
            if (projectSelect && projectSelect.value) {
                const projectMap = {
                    'maintenance': '常规保养',
                    'inspection': '车辆检测',
                    'wash': '精致洗车',
                    'charging': '充电服务',
                    'pickup': '取送车服务',
                    'tire': '轮胎更换',
                    'oil': '机油更换'
                };
                valueText = projectMap[projectSelect.value] || '项目';
            } else {
                valueText = '项目';
            }
            break;
        default:
            valueText = '优惠内容';
    }

    previewName.textContent = valueText + ' ' + typeText;
}

/**
 * 更新预览有效期
 */
function updatePreviewValidity() {
    const previewValidity = document.getElementById('previewValidity');
    if (!previewValidity) return;

    // 检查是否是电商券（固定时间激活）
    const businessTypeRadio = document.querySelector('input[name="businessType"]:checked');
    const isEcommerce = businessTypeRadio && businessTypeRadio.value === 'ecommerce';

    let activationType = 'fixedDate';
    if (!isEcommerce) {
        const activationRadio = document.querySelector('input[name="activationType"]:checked');
        if (!activationRadio) {
            previewValidity.textContent = '有效期：请配置有效期';
            return;
        }
        activationType = activationRadio.value;
    }

    let validityText = '有效期：';

    switch(activationType) {
        case 'immediate':
            const immediateType = document.querySelector('input[name="validityTypeImmediate"]:checked');
            if (immediateType && immediateType.value === 'fixed') {
                const startDate = document.getElementById('validityStartDate');
                const endDate = document.getElementById('validityEndDate');
                if (startDate && endDate && startDate.value && endDate.value) {
                    validityText += formatDate(startDate.value) + ' - ' + formatDate(endDate.value);
                } else {
                    validityText += '请选择日期';
                }
            } else {
                const days = document.getElementById('validityDays');
                if (days && days.value) {
                    validityText += '发放后' + days.value + '天内有效';
                } else {
                    validityText += '请输入天数';
                }
            }
            break;
        case 'fixedDate':
            const activationDate = document.getElementById('activationDate');
            const days1 = document.getElementById('validityAfterActivation1');
            if (activationDate && activationDate.value && days1 && days1.value) {
                validityText += formatDate(activationDate.value) + '激活，激活后' + days1.value + '天有效';
            } else {
                validityText += '请配置激活规则';
            }
            break;
        case 'userActivate':
            const userType = document.querySelector('input[name="validityTypeUser"]:checked');
            if (userType && userType.value === 'fixed') {
                const startDate2 = document.getElementById('validityUserStartDate');
                const endDate2 = document.getElementById('validityUserEndDate');
                if (startDate2 && endDate2 && startDate2.value && endDate2.value) {
                    validityText += formatDate(startDate2.value) + ' - ' + formatDate(endDate2.value);
                } else {
                    validityText += '请选择日期';
                }
            } else {
                const days2 = document.getElementById('validityAfterActivation2');
                if (days2 && days2.value) {
                    validityText += '激活后' + days2.value + '天内有效';
                } else {
                    validityText += '请输入天数';
                }
            }
            break;
        case 'delayActivate':
            const activationWindow = document.getElementById('activationWindow');
            const days3 = document.getElementById('validityAfterActivation3');
            if (activationWindow && activationWindow.value && days3 && days3.value) {
                validityText += '发放后' + activationWindow.value + '天内可激活，激活后' + days3.value + '天有效';
            } else {
                validityText += '请配置激活规则';
            }
            break;
        default:
            validityText += '请配置有效期';
    }

    previewValidity.textContent = validityText;
}

/**
 * 安全地设置规则列表内容
 */
function setRulesContent(container, rules) {
    // 清空容器
    while (container.firstChild) {
        container.removeChild(container.firstChild);
    }

    if (rules && rules.length > 0) {
        rules.forEach((rule, index) => {
            const textNode = document.createTextNode('• ' + rule);
            container.appendChild(textNode);
            if (index < rules.length - 1) {
                container.appendChild(document.createElement('br'));
            }
        });
    } else {
        const placeholder = document.createElement('span');
        placeholder.className = 'preview-placeholder';
        placeholder.textContent = '请输入内容';
        container.appendChild(placeholder);
    }
}

/**
 * 更新预览使用规则
 */
function updatePreviewRules() {
    const previewRulesTitle = document.getElementById('previewRulesTitle');
    const previewRules = document.getElementById('previewRules');
    if (!previewRules) return;

    // 更新标题
    if (previewRulesTitle) {
        const titleInput = document.getElementById('usageRulesTitle');
        previewRulesTitle.textContent = titleInput && titleInput.value ? titleInput.value : '使用规则';
    }

    // 更新内容
    const rulesInput = document.getElementById('usageRules');
    const rulesText = rulesInput ? rulesInput.value.trim() : '';
    const rules = rulesText ? rulesText.split('\n').filter(r => r.trim()) : [];

    // 清空并重建内容
    while (previewRules.firstChild) {
        previewRules.removeChild(previewRules.firstChild);
    }

    if (rules.length > 0) {
        rules.forEach((rule, index) => {
            const textNode = document.createTextNode('• ' + rule);
            previewRules.appendChild(textNode);
            if (index < rules.length - 1) {
                previewRules.appendChild(document.createElement('br'));
            }
        });
    } else {
        const placeholder = document.createElement('span');
        placeholder.className = 'preview-placeholder';
        placeholder.textContent = '请输入使用规则说明';
        previewRules.appendChild(placeholder);
    }
}

/**
 * 更新预览注意事项
 */
function updatePreviewNotes() {
    const previewNotesTitle = document.getElementById('previewNotesTitle');
    const previewNotes = document.getElementById('previewNotes');
    if (!previewNotes) return;

    // 更新标题
    if (previewNotesTitle) {
        const titleInput = document.getElementById('notesTitle');
        previewNotesTitle.textContent = titleInput && titleInput.value ? titleInput.value : '注意事项';
    }

    // 更新内容
    const notesInput = document.getElementById('notes');
    const notesText = notesInput ? notesInput.value.trim() : '';
    const notes = notesText ? notesText.split('\n').filter(n => n.trim()) : [];

    // 清空并重建内容
    while (previewNotes.firstChild) {
        previewNotes.removeChild(previewNotes.firstChild);
    }

    if (notes.length > 0) {
        notes.forEach((note, index) => {
            const textNode = document.createTextNode('• ' + note);
            previewNotes.appendChild(textNode);
            if (index < notes.length - 1) {
                previewNotes.appendChild(document.createElement('br'));
            }
        });
    } else {
        const placeholder = document.createElement('span');
        placeholder.className = 'preview-placeholder';
        placeholder.textContent = '请输入注意事项';
        previewNotes.appendChild(placeholder);
    }
}

/**
 * 格式化日期
 */
function formatDate(dateStr) {
    if (!dateStr) return '';
    return dateStr.replace(/-/g, '.');
}

/**
 * 全选/取消全选
 */
const selectAllCheckbox = document.getElementById('selectAll');
if (selectAllCheckbox) {
    selectAllCheckbox.addEventListener('change', function() {
        const checkboxes = document.querySelectorAll('tbody .table-checkbox');
        checkboxes.forEach(cb => {
            cb.checked = this.checked;
        });
        updateBatchButtonsState();
    });
}

// 监听单个复选框变化
document.addEventListener('change', function(e) {
    if (e.target.classList.contains('table-checkbox') && e.target.id !== 'selectAll') {
        updateBatchButtonsState();
    }
});

/**
 * 更新批量操作按钮状态
 */
function updateBatchButtonsState() {
    const selectedCount = getSelectedCoupons().length;
    const btnVoid = document.getElementById('btnVoid');
    const btnActivate = document.getElementById('btnActivate');
    const btnRetry = document.getElementById('btnRetry');

    if (btnVoid) {
        btnVoid.disabled = selectedCount === 0;
    }
    if (btnActivate) {
        btnActivate.disabled = selectedCount === 0;
    }
    if (btnRetry) {
        btnRetry.disabled = selectedCount === 0;
    }
}

/**
 * 获取选中的卡券
 */
function getSelectedCoupons() {
    const checkboxes = document.querySelectorAll('tbody .table-checkbox:checked');
    return Array.from(checkboxes).map(cb => {
        const row = cb.closest('tr');
        return {
            id: row.dataset.id,
            status: row.dataset.status
        };
    });
}

/**
 * Toast 提示
 */
function showToast(message, type) {
    type = type || 'success';
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    const toastIcon = toast ? toast.querySelector('.toast-icon') : null;

    if (!toast || !toastMessage) return;

    toastMessage.textContent = message;
    toast.classList.remove('hidden', 'toast-error', 'toast-warning');

    if (type === 'error') {
        toast.classList.add('toast-error');
        if (toastIcon) toastIcon.textContent = '✕';
    } else if (type === 'warning') {
        toast.classList.add('toast-warning');
        if (toastIcon) toastIcon.textContent = '⚠';
    } else {
        if (toastIcon) toastIcon.textContent = '✓';
    }

    setTimeout(function() {
        toast.classList.add('hidden');
    }, 3000);
}

/**
 * 安全地更新操作按钮
 */
function updateActionCell(actionCell, buttons) {
    while (actionCell.firstChild) {
        actionCell.removeChild(actionCell.firstChild);
    }
    buttons.forEach(function(btn, index) {
        var link = document.createElement('a');
        link.href = btn.href || '#';
        link.className = 'action-link' + (btn.primary ? ' action-primary' : '') + (btn.danger ? ' action-danger' : '');
        link.textContent = btn.text;
        if (btn.onclick) {
            link.onclick = btn.onclick;
        }
        actionCell.appendChild(link);
    });
    if (buttons.length === 0) {
        actionCell.textContent = '-';
    }
}

// ==================== 券组列表操作 (index.html) ====================

var currentCouponGroupId = null;
var currentCouponGroupName = null;

/**
 * 提交审核
 */
function submitForReview(id, name) {
    currentCouponGroupId = id;
    currentCouponGroupName = name;
    var el = document.getElementById('submitReviewName');
    if (el) el.textContent = name;
    showModal('submitReviewModal');
    return false;
}

/**
 * 删除券组
 */
function deleteCouponGroup(id, name) {
    currentCouponGroupId = id;
    currentCouponGroupName = name;
    var el = document.getElementById('deleteName');
    if (el) el.textContent = name;
    showModal('deleteModal');
    return false;
}

/**
 * 复制券组
 */
function copyCouponGroup(id, name) {
    currentCouponGroupId = id;
    currentCouponGroupName = name;
    var el = document.getElementById('copyNewName');
    if (el) el.value = name + ' - 副本';
    showModal('copyModal');
    return false;
}

/**
 * 下架券组
 */
function offlineCouponGroup(id, name) {
    currentCouponGroupId = id;
    currentCouponGroupName = name;
    var el = document.getElementById('offlineName');
    if (el) el.textContent = name;
    var reasonEl = document.getElementById('offlineReason');
    if (reasonEl) reasonEl.value = '';
    var countEl = document.getElementById('offlineReasonCount');
    if (countEl) countEl.textContent = '0';
    showModal('offlineModal');
    return false;
}

/**
 * 上架券组
 */
function onlineCouponGroup(id, name) {
    currentCouponGroupId = id;
    currentCouponGroupName = name;
    var el = document.getElementById('onlineName');
    if (el) el.textContent = name;
    showModal('onlineModal');
    return false;
}

// 初始化券组操作确认按钮
document.addEventListener('DOMContentLoaded', function() {
    // 提交审核确认
    var confirmSubmitReview = document.getElementById('confirmSubmitReview');
    if (confirmSubmitReview) {
        confirmSubmitReview.addEventListener('click', function() {
            var row = document.querySelector('tr[data-id="' + currentCouponGroupId + '"]');
            if (row) {
                row.dataset.status = 'pending';
                var statusSpan = row.querySelector('.status');
                if (statusSpan) {
                    statusSpan.className = 'status status-pending';
                    statusSpan.textContent = '待审核';
                }
                var actionCell = row.querySelector('.action-cell');
                if (actionCell) {
                    updateActionCell(actionCell, [
                        { text: '查看', href: './coupon-create.html' },
                        { text: '复制', onclick: function() { return copyCouponGroup(currentCouponGroupId, currentCouponGroupName); } }
                    ]);
                }
            }
            hideModal('submitReviewModal');
            showToast('已提交审核');
        });
    }

    // 删除确认
    var confirmDelete = document.getElementById('confirmDelete');
    if (confirmDelete) {
        confirmDelete.addEventListener('click', function() {
            var row = document.querySelector('tr[data-id="' + currentCouponGroupId + '"]');
            if (row) {
                row.remove();
                var countEl = document.querySelector('.table-info strong');
                if (countEl) {
                    var count = parseInt(countEl.textContent) - 1;
                    countEl.textContent = count;
                }
            }
            hideModal('deleteModal');
            showToast('删除成功');
        });
    }

    // 复制确认
    var confirmCopy = document.getElementById('confirmCopy');
    if (confirmCopy) {
        confirmCopy.addEventListener('click', function() {
            var newName = document.getElementById('copyNewName').value;
            if (!newName.trim()) {
                showToast('请输入券组名称', 'error');
                return;
            }
            hideModal('copyModal');
            showToast('复制成功，新券组「' + newName + '」已创建');
        });
    }

    // 下架确认
    var confirmOffline = document.getElementById('confirmOffline');
    if (confirmOffline) {
        confirmOffline.addEventListener('click', function() {
            var reason = document.getElementById('offlineReason').value;
            if (!reason.trim()) {
                showToast('请输入下架原因', 'error');
                return;
            }
            var row = document.querySelector('tr[data-id="' + currentCouponGroupId + '"]');
            if (row) {
                row.dataset.status = 'offline';
                var statusSpan = row.querySelector('.status');
                if (statusSpan) {
                    statusSpan.className = 'status status-offline';
                    statusSpan.textContent = '已下架';
                }
                var actionCell = row.querySelector('.action-cell');
                var gid = currentCouponGroupId;
                var gname = currentCouponGroupName;
                if (actionCell) {
                    updateActionCell(actionCell, [
                        { text: '管理', href: './coupon-instance.html', primary: true },
                        { text: '复制', onclick: function() { return copyCouponGroup(gid, gname); } },
                        { text: '上架', onclick: function() { return onlineCouponGroup(gid, gname); } }
                    ]);
                }
            }
            hideModal('offlineModal');
            showToast('下架成功');
        });
    }

    // 上架确认
    var confirmOnline = document.getElementById('confirmOnline');
    if (confirmOnline) {
        confirmOnline.addEventListener('click', function() {
            var row = document.querySelector('tr[data-id="' + currentCouponGroupId + '"]');
            if (row) {
                row.dataset.status = 'online';
                var statusSpan = row.querySelector('.status');
                if (statusSpan) {
                    statusSpan.className = 'status status-online';
                    statusSpan.textContent = '已上线';
                }
                var actionCell = row.querySelector('.action-cell');
                var gid = currentCouponGroupId;
                var gname = currentCouponGroupName;
                if (actionCell) {
                    updateActionCell(actionCell, [
                        { text: '管理', href: './coupon-instance.html', primary: true },
                        { text: '复制', onclick: function() { return copyCouponGroup(gid, gname); } },
                        { text: '下架', onclick: function() { return offlineCouponGroup(gid, gname); }, danger: true }
                    ]);
                }
            }
            hideModal('onlineModal');
            showToast('上架成功');
        });
    }

    // 下架原因字数统计
    var offlineReason = document.getElementById('offlineReason');
    if (offlineReason) {
        offlineReason.addEventListener('input', function() {
            var countEl = document.getElementById('offlineReasonCount');
            if (countEl) countEl.textContent = this.value.length;
        });
    }
});

// ==================== 卡券实例操作 (coupon-instance.html) ====================

var currentCouponCode = null;

/**
 * 激活单个卡券
 */
function activateCoupon(code) {
    currentCouponCode = code;
    var el = document.getElementById('activateCouponCode');
    if (el) el.textContent = code;
    showModal('singleActivateModal');
    return false;
}

/**
 * 作废单个卡券
 */
function voidCoupon(code) {
    currentCouponCode = code;
    var el = document.getElementById('voidCouponCode');
    if (el) el.textContent = code;
    var reasonEl = document.getElementById('singleVoidReason');
    if (reasonEl) reasonEl.value = '';
    var countEl = document.getElementById('singleVoidReasonCount');
    if (countEl) countEl.textContent = '0';
    showModal('singleVoidModal');
    return false;
}

/**
 * 反核销卡券
 */
function reverseCoupon(code) {
    currentCouponCode = code;
    var el = document.getElementById('reverseCouponCode');
    if (el) el.textContent = code;
    var reasonEl = document.getElementById('reverseReason');
    if (reasonEl) reasonEl.value = '';
    var countEl = document.getElementById('reverseReasonCount');
    if (countEl) countEl.textContent = '0';
    showModal('reverseModal');
    return false;
}

/**
 * 重推卡券
 */
function retryCoupon(code) {
    currentCouponCode = code;
    var el = document.getElementById('retryCouponCode');
    if (el) el.textContent = code;
    showModal('retryModal');
    return false;
}

/**
 * 导出卡券
 */
function exportCoupons() {
    showToast('导出任务已提交，请稍后在下载中心查看');
    return false;
}

// 初始化卡券实例操作确认按钮
document.addEventListener('DOMContentLoaded', function() {
    // 单个激活确认
    var confirmSingleActivate = document.getElementById('confirmSingleActivate');
    if (confirmSingleActivate) {
        confirmSingleActivate.addEventListener('click', function() {
            var row = document.querySelector('tr[data-id="' + currentCouponCode + '"]');
            if (row) {
                row.dataset.status = 'active';
                var statusSpan = row.querySelector('.status');
                if (statusSpan) {
                    statusSpan.className = 'status status-active';
                    statusSpan.textContent = '待使用';
                }
                var cells = row.querySelectorAll('td');
                if (cells[7]) {
                    cells[7].textContent = new Date().toISOString().split('T')[0];
                }
                var actionCell = row.querySelector('.action-cell');
                var code = currentCouponCode;
                if (actionCell) {
                    updateActionCell(actionCell, [
                        { text: '作废', onclick: function() { return voidCoupon(code); }, danger: true }
                    ]);
                }
            }
            hideModal('singleActivateModal');
            showToast('激活成功');
        });
    }

    // 单个作废确认
    var confirmSingleVoid = document.getElementById('confirmSingleVoid');
    if (confirmSingleVoid) {
        confirmSingleVoid.addEventListener('click', function() {
            var reason = document.getElementById('singleVoidReason').value;
            if (!reason.trim()) {
                showToast('请输入作废原因', 'error');
                return;
            }
            var row = document.querySelector('tr[data-id="' + currentCouponCode + '"]');
            if (row) {
                row.dataset.status = 'void';
                var statusSpan = row.querySelector('.status');
                if (statusSpan) {
                    statusSpan.className = 'status status-void';
                    statusSpan.textContent = '已作废';
                }
                var actionCell = row.querySelector('.action-cell');
                if (actionCell) {
                    updateActionCell(actionCell, []);
                }
            }
            hideModal('singleVoidModal');
            showToast('作废成功');
        });
    }

    // 反核销确认
    var confirmReverse = document.getElementById('confirmReverse');
    if (confirmReverse) {
        confirmReverse.addEventListener('click', function() {
            var reason = document.getElementById('reverseReason').value;
            if (!reason.trim()) {
                showToast('请输入反核销原因', 'error');
                return;
            }
            var row = document.querySelector('tr[data-id="' + currentCouponCode + '"]');
            if (row) {
                row.dataset.status = 'active';
                var statusSpan = row.querySelector('.status');
                if (statusSpan) {
                    statusSpan.className = 'status status-active';
                    statusSpan.textContent = '待使用';
                }
                var cells = row.querySelectorAll('td');
                if (cells[8]) cells[8].textContent = '-';
                if (cells[9]) cells[9].textContent = '-';
                var actionCell = row.querySelector('.action-cell');
                var code = currentCouponCode;
                if (actionCell) {
                    updateActionCell(actionCell, [
                        { text: '作废', onclick: function() { return voidCoupon(code); }, danger: true }
                    ]);
                }
            }
            hideModal('reverseModal');
            showToast('反核销成功');
        });
    }

    // 重推确认
    var confirmRetry = document.getElementById('confirmRetry');
    if (confirmRetry) {
        confirmRetry.addEventListener('click', function() {
            hideModal('retryModal');
            showToast('重推成功');
        });
    }

    // 批量作废确认
    var confirmBatchVoid = document.getElementById('confirmBatchVoid');
    if (confirmBatchVoid) {
        confirmBatchVoid.addEventListener('click', function() {
            var reason = document.getElementById('batchVoidReason').value;
            if (!reason.trim()) {
                showToast('请输入作废原因', 'error');
                return;
            }
            var selected = getSelectedCoupons();
            selected.forEach(function(item) {
                var row = document.querySelector('tr[data-id="' + item.id + '"]');
                if (row && (item.status === 'inactive' || item.status === 'active')) {
                    row.dataset.status = 'void';
                    var statusSpan = row.querySelector('.status');
                    if (statusSpan) {
                        statusSpan.className = 'status status-void';
                        statusSpan.textContent = '已作废';
                    }
                    var actionCell = row.querySelector('.action-cell');
                    if (actionCell) {
                        updateActionCell(actionCell, []);
                    }
                    var checkbox = row.querySelector('.table-checkbox');
                    if (checkbox) checkbox.checked = false;
                }
            });
            var selectAllEl = document.getElementById('selectAll');
            if (selectAllEl) selectAllEl.checked = false;
            hideModal('voidModal');
            showToast('批量作废成功');
        });
    }

    // 批量激活 - 打开弹窗时更新数量
    var btnActivate = document.getElementById('btnActivate');
    if (btnActivate) {
        btnActivate.addEventListener('click', function() {
            showModal('activateModal');
        });
    }

    // 批量激活确认
    var activateModalConfirm = document.querySelector('#activateModal .btn-danger');
    if (activateModalConfirm) {
        activateModalConfirm.addEventListener('click', function() {
            var selected = getSelectedCoupons();
            var activatedCount = 0;
            selected.forEach(function(item) {
                var row = document.querySelector('tr[data-id="' + item.id + '"]');
                if (row && item.status === 'inactive') {
                    row.dataset.status = 'active';
                    var statusSpan = row.querySelector('.status');
                    if (statusSpan) {
                        statusSpan.className = 'status status-active';
                        statusSpan.textContent = '待使用';
                    }
                    var cells = row.querySelectorAll('td');
                    if (cells[7]) {
                        cells[7].textContent = new Date().toISOString().split('T')[0];
                    }
                    var actionCell = row.querySelector('.action-cell');
                    var code = item.id;
                    if (actionCell) {
                        updateActionCell(actionCell, [
                            { text: '作废', onclick: function() { return voidCoupon(code); }, danger: true }
                        ]);
                    }
                    var checkbox = row.querySelector('.table-checkbox');
                    if (checkbox) checkbox.checked = false;
                    activatedCount++;
                }
            });
            var selectAllEl = document.getElementById('selectAll');
            if (selectAllEl) selectAllEl.checked = false;
            hideModal('activateModal');
            if (activatedCount > 0) {
                showToast('成功激活 ' + activatedCount + ' 张卡券');
            } else {
                showToast('没有可激活的卡券', 'warning');
            }
        });
    }

    // 批量作废 - 打开弹窗时更新数量
    var btnVoid = document.getElementById('btnVoid');
    if (btnVoid) {
        btnVoid.addEventListener('click', function() {
            var selected = getSelectedCoupons();
            var voidableCount = selected.filter(function(item) {
                return item.status === 'inactive' || item.status === 'active';
            }).length;
            var countEl = document.getElementById('batchVoidCount');
            if (countEl) countEl.textContent = voidableCount;
            var reasonEl = document.getElementById('batchVoidReason');
            if (reasonEl) reasonEl.value = '';
            var reasonCountEl = document.getElementById('batchVoidReasonCount');
            if (reasonCountEl) reasonCountEl.textContent = '0';
            showModal('voidModal');
        });
    }

    // 批量重推
    var btnRetry = document.getElementById('btnRetry');
    if (btnRetry) {
        btnRetry.addEventListener('click', function() {
            var selected = getSelectedCoupons();
            var retryCount = selected.filter(function(item) {
                return item.status === 'inactive';
            }).length;
            var countEl = document.getElementById('batchRetryCount');
            if (countEl) countEl.textContent = retryCount;
            showModal('batchRetryModal');
        });
    }

    // 批量重推确认
    var confirmBatchRetry = document.getElementById('confirmBatchRetry');
    if (confirmBatchRetry) {
        confirmBatchRetry.addEventListener('click', function() {
            document.querySelectorAll('tbody .table-checkbox:checked').forEach(function(cb) {
                cb.checked = false;
            });
            var selectAllEl = document.getElementById('selectAll');
            if (selectAllEl) selectAllEl.checked = false;
            hideModal('batchRetryModal');
            showToast('批量重推成功');
        });
    }

    // 导入确认
    var confirmImport = document.getElementById('confirmImport');
    if (confirmImport) {
        confirmImport.addEventListener('click', function() {
            hideModal('importModal');
            showToast('导入任务已提交，处理完成后将通知您');
        });
    }

    // 发放卡券确认
    var issueModalConfirm = document.querySelector('#issueModal .btn-danger');
    if (issueModalConfirm) {
        issueModalConfirm.addEventListener('click', function() {
            var reasonSelect = document.querySelector('#issueModal .form-select');
            if (reasonSelect && !reasonSelect.value) {
                showToast('请选择发放原因', 'error');
                return;
            }
            hideModal('issueModal');
            showToast('发放任务已提交');
        });
    }

    // 字数统计
    var singleVoidReason = document.getElementById('singleVoidReason');
    if (singleVoidReason) {
        singleVoidReason.addEventListener('input', function() {
            var countEl = document.getElementById('singleVoidReasonCount');
            if (countEl) countEl.textContent = this.value.length;
        });
    }

    var batchVoidReason = document.getElementById('batchVoidReason');
    if (batchVoidReason) {
        batchVoidReason.addEventListener('input', function() {
            var countEl = document.getElementById('batchVoidReasonCount');
            if (countEl) countEl.textContent = this.value.length;
        });
    }

    var reverseReason = document.getElementById('reverseReason');
    if (reverseReason) {
        reverseReason.addEventListener('input', function() {
            var countEl = document.getElementById('reverseReasonCount');
            if (countEl) countEl.textContent = this.value.length;
        });
    }
});

// ==================== 创建券组页新增功能 ====================

/**
 * 适用门店联动
 */
function initApplicableDealerCascade() {
    var dealerRadios = document.querySelectorAll('input[name="applicableDealer"]');
    var specifiedDealerHint = document.getElementById('specifiedDealerHint');
    var previewDealerValue = document.getElementById('previewDealerValue');

    if (!dealerRadios.length) return;

    dealerRadios.forEach(function(radio) {
        radio.addEventListener('change', function() {
            if (this.value === 'specified') {
                if (specifiedDealerHint) specifiedDealerHint.classList.remove('hidden');
                if (previewDealerValue) previewDealerValue.textContent = '部分经销商可用';
            } else {
                if (specifiedDealerHint) specifiedDealerHint.classList.add('hidden');
                if (previewDealerValue) previewDealerValue.textContent = '全网经销商可用';
            }
        });
    });
}

/**
 * 兑换内容实时预览
 */
function initExchangeContentPreview() {
    var exchangeContentInput = document.getElementById('exchangeContent');
    var previewExchangeValue = document.getElementById('previewExchangeValue');
    var previewExchangeSection = document.getElementById('previewExchangeSection');

    if (!exchangeContentInput) return;

    exchangeContentInput.addEventListener('input', function() {
        if (previewExchangeValue) {
            previewExchangeValue.textContent = this.value || '请输入兑换内容';
        }
    });

    // 监听抵扣类型变化，显示/隐藏兑换内容区域
    var discountRadios = document.querySelectorAll('input[name="discountType"]');
    discountRadios.forEach(function(radio) {
        radio.addEventListener('change', function() {
            var exchangeContentRow = document.getElementById('exchangeContentRow');
            // 仅三方券兑换券显示兑换内容
            if (this.value === 'exchange-thirdparty') {
                if (exchangeContentRow) exchangeContentRow.classList.remove('hidden');
                if (previewExchangeSection) previewExchangeSection.classList.remove('hidden');
            } else {
                if (exchangeContentRow) exchangeContentRow.classList.add('hidden');
                if (previewExchangeSection) previewExchangeSection.classList.add('hidden');
            }
        });
    });
}

/**
 * 电商券关联商品按钮
 */
function initLinkProductButton() {
    var linkProductBtn = document.getElementById('linkProductBtn');
    var linkedProductCount = 0;

    if (!linkProductBtn) return;

    linkProductBtn.addEventListener('click', function() {
        // 模拟跳转到选择关联商品页面
        alert('跳转到选择关联商品列表页（功能暂未实现）');
        // 模拟已关联商品
        linkedProductCount = 5;
        linkProductBtn.textContent = '已关联 ' + linkedProductCount + ' 件商品';
    });
}

/**
 * 卡券标题自动拼接
 */
function initCouponTitleAutoFill() {
    var couponTitleInput = document.getElementById('couponTitle');
    if (!couponTitleInput) return;

    // 监听满减规则、折扣规则、项目抵扣等变化
    var thresholdAmountAftersales = document.getElementById('thresholdAmountAftersales');
    var reduceAmountAftersales = document.getElementById('reduceAmountAftersales');
    var discountThreshold = document.getElementById('discountThreshold');
    var discountRate = document.getElementById('discountRate');
    var projectSelectAftersales = document.getElementById('projectSelectAftersales');
    var membershipYears = document.getElementById('membershipYears');
    var reduceAmountMember = document.getElementById('reduceAmountMember');
    var exchangeContent = document.getElementById('exchangeContent');

    function updateCouponTitle() {
        var discountTypeRadio = document.querySelector('input[name="discountType"]:checked');
        if (!discountTypeRadio) return;

        var discountType = discountTypeRadio.value;
        var title = '';

        // 根据抵扣类型生成标题
        if (discountType.includes('threshold')) {
            // 满减券
            var threshold = 0;
            var reduce = 0;
            if (discountType === 'threshold-aftersales' || discountType === 'threshold-pickup') {
                threshold = thresholdAmountAftersales ? thresholdAmountAftersales.value : 0;
                reduce = reduceAmountAftersales ? reduceAmountAftersales.value : 0;
            } else if (discountType === 'threshold') {
                threshold = 0;
                reduce = reduceAmountMember ? reduceAmountMember.value : 0;
            }
            if (reduce) {
                title = threshold > 0 ? '满' + threshold + '减' + reduce + ' 满减券' : reduce + '元 满减券';
            } else {
                title = '满减券';
            }
        } else if (discountType.includes('discount')) {
            // 折扣券
            var rate = discountRate ? discountRate.value : '';
            title = rate ? rate + '折 折扣券' : '折扣券';
        } else if (discountType.includes('project')) {
            // 项目抵扣券
            var projectText = '';
            if (projectSelectAftersales && projectSelectAftersales.value) {
                var selectedOption = projectSelectAftersales.options[projectSelectAftersales.selectedIndex];
                projectText = selectedOption ? selectedOption.text : '';
            }
            title = projectText ? projectText + ' 项目抵扣券' : '项目抵扣券';
        } else if (discountType === 'exchange-thirdparty') {
            // 三方券兑换券：兑换内容 兑换券
            var content = exchangeContent ? exchangeContent.value : '';
            title = content ? content + ' 兑换券' : '兑换券';
        } else if (discountType.includes('exchange')) {
            // 会员券兑换
            var years = membershipYears ? membershipYears.value : '';
            title = years ? years + '年会籍 兑换券' : '兑换券';
        }

        // 只有在用户没有手动修改过的情况下才更新
        if (!couponTitleInput.dataset.userModified) {
            couponTitleInput.value = title;
        }

        // 同步更新预览区域的卡券名称
        updatePreviewName();
    }

    // 监听用户手动修改
    couponTitleInput.addEventListener('input', function() {
        this.dataset.userModified = 'true';
        updatePreviewName();
    });

    // 监听相关输入字段变化
    [thresholdAmountAftersales, reduceAmountAftersales, discountThreshold, discountRate,
     projectSelectAftersales, membershipYears, reduceAmountMember, exchangeContent].forEach(function(el) {
        if (el) {
            el.addEventListener('change', updateCouponTitle);
            el.addEventListener('input', updateCouponTitle);
        }
    });

    // 监听抵扣类型变化
    var discountRadios = document.querySelectorAll('input[name="discountType"]');
    discountRadios.forEach(function(radio) {
        radio.addEventListener('change', function() {
            couponTitleInput.dataset.userModified = '';
            updateCouponTitle();
        });
    });
}

/**
 * 添加自定义内容组
 */
var customContentIndex = 2; // 从2开始，因为已经有1和2两组

function initAddCustomContent() {
    var addBtn = document.getElementById('addCustomContentBtn');
    var container = document.getElementById('customContentContainer');

    if (!addBtn || !container) return;

    addBtn.addEventListener('click', function() {
        customContentIndex++;
        var newGroup = document.createElement('div');
        newGroup.className = 'custom-content-group';
        newGroup.dataset.index = customContentIndex;
        newGroup.innerHTML =
            '<div class="form-row">' +
                '<label class="form-label">自定义标题' + customContentIndex + '</label>' +
                '<div class="form-control">' +
                    '<div class="custom-title-row">' +
                        '<input type="text" class="form-input custom-title" id="customTitle' + customContentIndex + '" placeholder="请输入标题" maxlength="20">' +
                        '<button type="button" class="btn btn-link btn-sm remove-custom-content" data-index="' + customContentIndex + '">删除</button>' +
                    '</div>' +
                '</div>' +
            '</div>' +
            '<div class="form-row">' +
                '<label class="form-label">自定义内容</label>' +
                '<div class="form-control">' +
                    '<textarea class="form-textarea custom-content" id="customContent' + customContentIndex + '" placeholder="请输入内容，每行一条" maxlength="500"></textarea>' +
                    '<div class="char-count"><span id="customCount' + customContentIndex + '">0</span>/500</div>' +
                '</div>' +
            '</div>';
        container.appendChild(newGroup);

        // 添加字数统计监听
        var textarea = newGroup.querySelector('.custom-content');
        var countSpan = newGroup.querySelector('.char-count span');
        textarea.addEventListener('input', function() {
            countSpan.textContent = this.value.length;
            updateCustomContentPreview();
        });

        // 添加标题变化监听
        var titleInput = newGroup.querySelector('.custom-title');
        titleInput.addEventListener('input', updateCustomContentPreview);

        // 添加删除按钮监听
        var removeBtn = newGroup.querySelector('.remove-custom-content');
        removeBtn.addEventListener('click', function() {
            newGroup.remove();
            updateCustomContentPreview();
        });

        // 添加预览区域对应模块
        addPreviewCustomContent(customContentIndex);
    });

    // 初始化已有内容的字数统计和预览监听
    document.querySelectorAll('.custom-content').forEach(function(textarea) {
        var countId = textarea.id.replace('customContent', 'customCount');
        var countSpan = document.getElementById(countId);
        if (textarea && countSpan) {
            textarea.addEventListener('input', function() {
                countSpan.textContent = this.value.length;
                updateCustomContentPreview();
            });
        }
    });

    document.querySelectorAll('.custom-title').forEach(function(input) {
        input.addEventListener('input', updateCustomContentPreview);
    });
}

/**
 * 添加预览区域自定义内容模块
 */
function addPreviewCustomContent(index) {
    var container = document.getElementById('previewCustomContentContainer');
    if (!container) return;

    var newPreview = document.createElement('div');
    newPreview.className = 'preview-rules';
    newPreview.dataset.previewIndex = index;
    newPreview.style.marginTop = '12px';
    newPreview.innerHTML =
        '<div class="preview-rules-title"></div>' +
        '<div class="preview-rules-list">' +
            '<span class="preview-placeholder">请输入自定义内容</span>' +
        '</div>';
    container.appendChild(newPreview);
}

/**
 * 更新自定义内容预览
 */
function updateCustomContentPreview() {
    document.querySelectorAll('.custom-content-group').forEach(function(group) {
        var index = group.dataset.index;
        var titleInput = group.querySelector('.custom-title');
        var contentTextarea = group.querySelector('.custom-content');
        var previewSection = document.querySelector('[data-preview-index="' + index + '"]');

        if (!previewSection) return;

        var titleEl = previewSection.querySelector('.preview-rules-title');
        var contentEl = previewSection.querySelector('.preview-rules-list');

        if (titleEl && titleInput) {
            titleEl.textContent = titleInput.value || '自定义标题' + index;
        }

        if (contentEl && contentTextarea) {
            var text = contentTextarea.value.trim();
            var lines = text ? text.split('\n').filter(function(n) { return n.trim(); }) : [];

            while (contentEl.firstChild) {
                contentEl.removeChild(contentEl.firstChild);
            }

            if (lines.length > 0) {
                lines.forEach(function(line, i) {
                    contentEl.appendChild(document.createTextNode('• ' + line));
                    if (i < lines.length - 1) {
                        contentEl.appendChild(document.createElement('br'));
                    }
                });
            } else {
                var placeholder = document.createElement('span');
                placeholder.className = 'preview-placeholder';
                placeholder.textContent = '请输入自定义内容';
                contentEl.appendChild(placeholder);
            }
        }
    });
}
