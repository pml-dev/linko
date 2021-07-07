<?php
namespace linko\Game\Color;
/**
 * Description of Color
 *
 * @author Mr_Kywar mr_kywar@gmail.com
 */
class Color {
    /**
     * @var string
     */
    private $name;
    
    /**
     * @var string
     */
    private $code;
    
    public function __construct(string $code="", string $name="") {
        $this->code = $code;
        $this->name = $name;
        return $this;
    }
    
    public function getName(): string {
        return $this->name;
    }

    public function getCode(): string {
        return $this->code;
    }

    public function setName(string $name) {
        $this->name = $name;
        return $this;
    }

    public function setCode(string $code) {
        $this->code = $code;
        return $this;
    }


}
