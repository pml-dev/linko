<?php
namespace linko\Game\Color;

/**
 * Description of ColorCollection
 *
 * @author Mr_Kywar mr_kywar@gmail.com
 */
class ColorCollection extends ArrayIterator{
   
    
    public function addColor(Color $color): ColorCollection {
        if($this->offsetExists($color->getCode())){
            throw new ColorCollectionException("Color code already used");
        }
        $this->offsetSet($color->getCode(), $color);
        return $this;
    }
    
    public function removeColor(Color $color): ColorCollection {
        if(!$this->offsetExists($color->getCode())){
            throw new ColorCollectionException("Color code isn't used");
        }
        $this->offsetUnset($color->getCode());
        return $this;
    }


    protected function getKeys() {
        $keys= array();
        
        foreach ($this as $val){
            $keys[] = $val->getCode();
        }
        
        return $keys;
        
    }
    
    
    public function getCodes() {
        return $this->getKeys();
    }

}
