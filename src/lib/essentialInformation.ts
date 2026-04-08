export type EssentialQuestionType =
    | 'TEXT'
    | 'DATE'
    | 'MULTIPLE_CHOICE'
    | 'PARAGRAPH_TEXT'
    | 'CHECKBOX'
    | 'PAGE_BREAK'
    | 'FILE_UPLOAD'

export interface EssentialQuestion {
    id: string
    title: string
    type: EssentialQuestionType
    choices?: string[]
}

export type EssentialAnswerValue = string | string[]
export type EssentialAnswers = Record<string, EssentialAnswerValue>

export const ESSENTIAL_INFORMATION_FORM = {
    title: 'ChulFitCoach Onboarding',
    description:
        "Thank you for choosing ChulFitCoach. I'm grateful to accompany you on this journey. To make sure your training plan is safe, effective, and perfectly aligned with who you are, I'll need a bit of information from you. Your responses will help me build a program that truly fits you.\n\nCam on ban da chon ChulFitCoach. Toi rat vui duoc dong hanh cung ban tren hanh trinh ren luyen. De hieu ro hon ve ban va thiet ke mot chuong trinh tap luyen phu hop voi the trang, loi song va muc tieu cua ban, vui long cung cap nhung thong tin ben duoi.",
    questions: [
        { id: 'section_basic_info', title: 'Thông tin cơ bản', type: 'PAGE_BREAK' },
        { id: 'q1_full_name', title: '1. Họ và tên', type: 'TEXT' },
        { id: 'q2_birth_date', title: '2. Ngày tháng năm sinh', type: 'DATE' },
        {
            id: 'q3_gender',
            title: '3. Giới tính',
            type: 'MULTIPLE_CHOICE',
            choices: ['Nam', 'Nữ', 'Không tiết lộ'],
        },
        { id: 'q4_email', title: '4. Email', type: 'TEXT' },
        { id: 'q5_phone', title: '5. Số điện thoại', type: 'TEXT' },
        { id: 'q6_address', title: '6. Địa chỉ', type: 'TEXT' },
        { id: 'q7_gym_experience', title: '7. Đã tập gym được bao lâu?', type: 'TEXT' },
        {
            id: 'q8_1_program_file',
            title: '8.1 Chương trình tập mà bạn đang theo? (file)',
            type: 'FILE_UPLOAD',
        },
        {
            id: 'q8_2_program_description',
            title: '8.2 Chương trình tập luyện bạn đang theo',
            type: 'PARAGRAPH_TEXT',
        },
        { id: 'q9_job', title: '9. Nghề nghiệp', type: 'TEXT' },
        { id: 'section_body_metrics', title: 'Thông số cơ thể', type: 'PAGE_BREAK' },
        { id: 'q10_height', title: '10. Chiều cao (cm)', type: 'TEXT' },
        { id: 'q11_weight', title: '11. Cân nặng (kg)', type: 'TEXT' },
        { id: 'q12_body_fat', title: '12. Phần trăm mỡ cơ thể (%)', type: 'TEXT' },
        { id: 'q13_muscle_weight', title: '13. Trọng lượng cơ (kg)', type: 'TEXT' },
        { id: 'q14_chest', title: '14. Vòng ngực (cm)', type: 'TEXT' },
        { id: 'q15_waist', title: '15. Vòng eo (cm)', type: 'TEXT' },
        { id: 'q16_lower_belly_female', title: '16. Bụng dưới đối với nữ (cm)', type: 'TEXT' },
        { id: 'q17_hip', title: '17. Vòng mông (cm)', type: 'TEXT' },
        { id: 'q18_arm', title: '18. Bắp tay (cm)', type: 'TEXT' },
        { id: 'q19_thigh', title: '19. Đùi (cm)', type: 'TEXT' },
        { id: 'q20_calf', title: '20. Bắp chân (cm)', type: 'TEXT' },
        { id: 'section_goals', title: 'Mục tiêu tập luyện', type: 'PAGE_BREAK' },
        {
            id: 'q21_training_goals',
            title: '21. Mục tiêu tập luyện',
            type: 'CHECKBOX',
            choices: [
                'Tăng cơ tăng cân',
                'Giảm mỡ giảm cân',
                'Thân hình thon gọn, khoẻ mạnh',
                'Thay đổi lối sống lành mạnh, giảm stress',
                'Tăng sức bền cơ bắp cũng như tim mạch',
            ],
        },
        {
            id: 'q22_expectation',
            title: '22. Bạn muốn đạt được điều gì từ tập luyện?',
            type: 'PARAGRAPH_TEXT',
        },
        { id: 'section_health', title: 'Sức khoẻ', type: 'PAGE_BREAK' },
        {
            id: 'q23_medical_history',
            title: '23. Bạn có bất kì tiền sử bệnh nào không?',
            type: 'CHECKBOX',
            choices: [
                'Không bị bệnh',
                'Tiểu đường',
                'Tim mạch',
                'Đau tức ngực',
                'Loãng xương',
                'Huyết áp cao',
                'Huyết áp thấp',
                'Viêm khớp',
                'Hen suyễn',
                'Mỡ máu',
            ],
        },
        {
            id: 'q24_stimulants',
            title: '24. Bạn có đang dùng chất kích thích nào không?',
            type: 'CHECKBOX',
            choices: ['Không sử dụng', 'Rượu', 'Bia', 'Thuốc lá'],
        },
        {
            id: 'q25_injuries',
            title: '25. Bạn có từng gặp bất kì chấn thương vật lý nào không?',
            type: 'PARAGRAPH_TEXT',
        },
        { id: 'section_workout', title: 'Tập luyện', type: 'PAGE_BREAK' },
        {
            id: 'q26_muscle_focus',
            title: '26. Bạn muốn cải thiện nhóm cơ nào?',
            type: 'PARAGRAPH_TEXT',
        },
        {
            id: 'q27_1_week_days',
            title: '27.1 Bạn tập những ngày nào trong tuần',
            type: 'CHECKBOX',
            choices: ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'],
        },
        {
            id: 'q27_2_preferred_time',
            title: '27.2 Thời gian tập luyện thích hợp của bạn là mấy giờ ?',
            type: 'PARAGRAPH_TEXT',
        },
        {
            id: 'q28_activity_level',
            title:
                '28. Bạn có thường xuyên vận động đi lại như: Dắt chó đi dạo, làm việc nhà, công việc đi lại nhiều như bán hàng, phục vụ, hay hoạt động thể thao ngoài trời khác?',
            type: 'PARAGRAPH_TEXT',
        },
        {
            id: 'q29_stress_level',
            title: '29. Bạn thường xuyên bị căng thẳng (stress)?',
            type: 'MULTIPLE_CHOICE',
            choices: [
                'Hầu như không',
                'Thỉnh thoảng, căng thẳng nhẹ (như sinh viên trong thời gian thi cử...)',
                'Căng thẳng trung bình (làm việc toàn thời gian với deadline...)',
                'Căng thẳng cao (làm việc trong môi trường với áp lực, trách nhiệm cao, gia đình...)',
            ],
        },
        {
            id: 'q30_sleep_quality',
            title: '30. Chất lượng giấc ngủ của bạn thế nào?',
            type: 'PARAGRAPH_TEXT',
        },
        {
            id: 'q31_supplements',
            title: '31. Các sản phẩm supplement/hỗ trợ sức khoẻ bạn đang dùng',
            type: 'PARAGRAPH_TEXT',
        },
        { id: 'section_nutrition', title: 'Ăn uống', type: 'PAGE_BREAK' },
        {
            id: 'q32_daily_meals',
            title: '32. Thực đơn thường ngày của bạn như thế nào?',
            type: 'PARAGRAPH_TEXT',
        },
        {
            id: 'q33_macros',
            title:
                '33. Nêu rõ loại protein, carb, fat bạn thường ăn theo thói quen, sở thích hay phù hợp với điều kiện kinh tế?',
            type: 'PARAGRAPH_TEXT',
        },
        {
            id: 'q34_eating_habit',
            title: '34. Bạn có thường xuyên ăn ngoài, tiệc tùng, hay tự nấu ăn ở nhà?',
            type: 'PARAGRAPH_TEXT',
        },
    ] as EssentialQuestion[],
}

export const ESSENTIAL_RENDER_QUESTIONS = ESSENTIAL_INFORMATION_FORM.questions.filter(
    (question) => question.type !== 'FILE_UPLOAD'
)

export const ESSENTIAL_REQUIRED_QUESTIONS = ESSENTIAL_INFORMATION_FORM.questions.filter(
    (question) => question.type !== 'FILE_UPLOAD' && question.type !== 'PAGE_BREAK'
)

export function isAnswerFilled(value: unknown): boolean {
    if (Array.isArray(value)) {
        return value.some((item) => typeof item === 'string' && item.trim().length > 0)
    }

    if (typeof value === 'string') {
        return value.trim().length > 0
    }

    return false
}

export function getMissingEssentialQuestions(answers: Record<string, unknown>): EssentialQuestion[] {
    return ESSENTIAL_REQUIRED_QUESTIONS.filter((question) => !isAnswerFilled(answers[question.id]))
}


